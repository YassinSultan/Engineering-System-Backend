import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { escapeRegExp } from "../../../utils/escapeRegExp.js";
import ProjectModel from "../models/Project.model.js";



// create project
export const createProject = catchAsync(async (req, res, next) => {
    try {
        const currentUser = req.user;
        const body = { ...req.body };
        const files = req.files;

        console.log("data", body);
        console.log("files", files);

        const projectData = {
            name: body.name,
            contractingParty: body.contractingParty,
            status: body.status,
            code: body.code,
            startDate: new Date(body.startDate),
            location: body.location,
            landArea: Number(body.landArea),
            organizationalUnit: body.organizationalUnit,
            createdBy: currentUser._id,
        };

        /* ======================
           Coordinates
        ====================== */
        if (body["coordinates.lat"] && body["coordinates.lng"]) {
            projectData.coordinates = {
                lat: Number(body["coordinates.lat"]),
                lng: Number(body["coordinates.lng"]),
            };
        }
        /* ======================
            Files
        ====================== */
        if (files?.networkBudgetFile) {
            projectData.networkBudgetFile = files.networkBudgetFile[0].relativePath;
        }

        if (files?.siteHandoverFile) {
            projectData.siteHandoverFile = files.siteHandoverFile[0].relativePath;
        }
        /* ======================
            Budget / Military
        ====================== */
        if (body.contractingParty === "MILITARY" || body.contractingParty === "BUDGET") {
            projectData.estimatedCost = {
                value: Number(body["estimatedCost.value"]),
                file: files?.["estimatedCost.file"]?.[0]?.relativePath,
            };

            projectData.securityApprovalFile =
                files?.securityApprovalFile?.[0]?.relativePath;

            if (body.contractingParty === "BUDGET") {
                projectData.fiscalYear = body.fiscalYear;
            }
        }
        /* ======================
            Civilian
        ====================== */
        if (body.contractingParty === "CIVILIAN") {
            projectData.ownerEntity = body.ownerEntity;
        }

        const project = await ProjectModel.create(projectData);
        res.status(201).json({
            status: "success",
            data: project,
        });

    } catch (err) {
        console.log(err);
        return next(
            new AppError(
                err.message || "Project creation failed",
                400
            )
        );
    }
});

// get all projects
export const getAllProjects = catchAsync(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder || "desc";
        let filters = {};
        console.log(req.query.filters);
        if (req.query.filters) {
            try {
                filters = JSON.parse(req.query.filters);
            } catch (e) {
                return res.status(400).json({ success: false, message: "Invalid filters format" });
            }
        }
        const query = { isDeleted: false };
        if (search) {
            query.$text = { $search: search };
        }
        Object.keys(filters).forEach((field) => {
            if (filters[field]) {
                query[field] = { $regex: new RegExp(escapeRegExp(filters[field]), "i") };
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
        res.status(200).json({
            success: true,
            data: projects.docs,
            total: projects.totalDocs,
            limit: projects.limit,
            page: projects.page,
            totalPages: projects.totalPages,
        });

    } catch (err) {
        // handle Mongopose error
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "Project already exists" });
        }
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});