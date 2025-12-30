import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { CONTRACT_FIELDS, resetForbiddenFields, validateContractPayload } from "../../../utils/projectRules.js";
import ProjectModel from "../models/Project.model.js";
import CashFlowModel from "../../cashFlow/models/cashFlow.model.js";
import ProtocolModel from "../../protocol/models/Protocol.model.js";
import PlanningBudgetModel from "../../planningBudget/models/planningBudget.model.js";

// create project
export const createProject = catchAsync(async (req, res, next) => {
    const body = req.body;
    console.log(body);
    const files = req.files || {};
    console.log(files);
    const projectData = {
        name: body.name,
        contractingParty: body.contractingParty,
        status: body.status || "STUDY",
        code: body.code,
        startDate: new Date(body.startDate),
        location: body.location,
        landArea: Number(body.landArea),
        organizationalUnit: body.organizationalUnit,
        createdBy: req.user._id,
    };

    // coordinates
    if (body.coordinates?.lat && body.coordinates?.lng) {
        projectData.coordinates = {
            lat: Number(body.coordinates.lat),
            lng: Number(body.coordinates.lng)
        };
    }

    // ملفات عادية
    if (files.networkBudgetFile?.[0]) {
        projectData.networkBudgetFile = files.networkBudgetFile[0].relativePath;
    }
    if (files.siteHandoverFile?.[0]) {
        projectData.siteHandoverFile = files.siteHandoverFile[0].relativePath;
    }

    // estimatedCost + securityApprovalFile
    if (["MILITARY", "BUDGET"].includes(body.contractingParty)) {
        projectData.estimatedCost = {
            value: Number(body.estimatedCost?.value),
            file: files["estimatedCost.file"]?.[0]?.relativePath
        };
        projectData.securityApprovalFile = files.securityApprovalFile?.[0]?.relativePath;

        if (body.contractingParty === "BUDGET") {
            projectData.fiscalYear = body.fiscalYear;
        }
    }

    if (body.contractingParty === "CIVILIAN") {
        projectData.ownerEntity = body.ownerEntity;
    }

    const project = await ProjectModel.create(projectData);

    res.status(201).json({ success: true, data: project });
});

// get all projects
export const getAllProjects = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder || "desc";

    let filters = {};
    if (req.query.filters) {
        filters = JSON.parse(req.query.filters);
    }

    const query = { isDeleted: false };

    if (search) {
        query.$text = { $search: search };
    }

    Object.keys(filters).forEach((field) => {
        if (filters[field]) {
            query[field] = { $regex: new RegExp(filters[field], "i") };
        }
    });

    const options = {
        page,
        limit,
        sort: search
            ? { score: { $meta: "textScore" } }
            : { [sortBy]: sortOrder === "desc" ? -1 : 1 },
        lean: true,
    };

    const projects = await ProjectModel.paginate(query, options);

    // 🔥 populate virtuals manually
    await ProjectModel.populate(projects.docs, {
        path: "protocols",
        populate: [
            { path: "planningBudget" },
            { path: "cashFlows" },
        ],
    });

    res.status(200).json({
        success: true,
        data: projects.docs,
        total: projects.totalDocs,
        limit: projects.limit,
        page: projects.page,
        totalPages: projects.totalPages,
    });
});

export const getSpecificProject = catchAsync(async (req, res, next) => {
    try {
        const project = await ProjectModel.findById(req.params.id)
            .populate("organizationalUnit")
            .populate("ownerEntity")
            .populate({
                path: "protocols",
                populate: [
                    { path: "planningBudget" },
                    { path: "cashFlows" },
                ],
            });

        if (!project) return next(new AppError("project not found", 404));

        res.json({ success: true, data: project });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export const updateProject = catchAsync(async (req, res, next) => {
    const body = req.body;
    const files = req.files || {};

    const project = await ProjectModel.findById(req.params.id);
    if (!project) return next(new AppError("المشروع غير موجود", 404));

    const currentParty = project.contractingParty;
    const incomingParty = body.contractingParty;

    // تغيير نوع الطرف المتعاقد
    if (incomingParty && incomingParty !== currentParty) {
        const newRules = CONTRACT_FIELDS[incomingParty];
        if (!newRules) return next(new AppError("نوع الطرف غير صالح", 400));

        if (currentParty === "CIVILIAN" && incomingParty !== "CIVILIAN") {
            const protocols = await ProtocolModel.find({ project: project._id });
            const protocolIds = protocols.map(p => p._id);

            await ProtocolModel.updateMany(
                { _id: { $in: protocolIds } },
                { $set: { isDeleted: true } }
            );
            await CashFlowModel.updateMany(
                { protocol: { $in: protocolIds } },
                { $set: { isDeleted: true } }
            );
            await PlanningBudgetModel.updateMany(
                { protocol: { $in: protocolIds } },
                { $set: { isDeleted: true } }
            );
        }

        // Unset الحقول الممنوعة مباشرة من الـ database
        if (newRules.forbidden?.length) {
            const unsetObj = {};
            newRules.forbidden.forEach(f => {
                unsetObj[f] = "";
            });
            await ProjectModel.updateOne({ _id: project._id }, { $unset: unsetObj });
        }

        project.contractingParty = incomingParty;
    }

    // تحديث باقي الحقول
    const simpleFields = [
        "name",
        "code",
        "status",
        "startDate",
        "location",
        "landArea",
        "organizationalUnit",
        "fiscalYear",
        "ownerEntity"
    ];

    simpleFields.forEach(field => {
        if (body[field] !== undefined) {
            project[field] = body[field];
        }
    });

    if (body.coordinates?.lat !== undefined && body.coordinates?.lng !== undefined) {
        project.coordinates = {
            lat: Number(body.coordinates.lat),
            lng: Number(body.coordinates.lng)
        };
    }

    project.estimatedCost = project.estimatedCost || {};
    if (body.estimatedCost?.value !== undefined) {
        project.estimatedCost.value = Number(body.estimatedCost.value);
    }

    // تحديث الملفات
    if (files.networkBudgetFile?.[0]) project.networkBudgetFile = files.networkBudgetFile[0].relativePath;
    if (files.siteHandoverFile?.[0]) project.siteHandoverFile = files.siteHandoverFile[0].relativePath;
    if (files["estimatedCost.file"]?.[0]) project.estimatedCost.file = files["estimatedCost.file"][0].relativePath;
    if (files.securityApprovalFile?.[0]) project.securityApprovalFile = files.securityApprovalFile[0].relativePath;

    try {
        validateContractPayload(project.contractingParty, project.toObject());
    } catch (err) {
        return next(new AppError(err.message, 400));
    }

    await project.save({ validateBeforeSave: true });

    const updatedProject = await ProjectModel.findById(project._id)
        .populate("organizationalUnit ownerEntity");

    res.json({
        success: true,
        data: updatedProject
    });
});

export const suggestionsProjects = catchAsync(async (req, res, next) => {

}); 