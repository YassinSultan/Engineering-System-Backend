
import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { deleteFiles } from "../../../utils/deleteFiles.js";
import logger from "../../../utils/logger.js";
import ExcelJS from "exceljs";
import { escapeRegExp } from "../../../utils/escapeRegExp.js";
import billOfQuantitieModel from "../models/billOfQuantitie.model.js";
import { SUGGESTION_REGISTRY } from "../../suggestions/registry.js";
import { buildFilters } from "../../../utils/buildFilters.js";

export const createBillOfQuantitie = catchAsync(async (req, res, next) => {
    const data = { ...req.body, disciplines: JSON.parse(req.body.disciplines), attachments: {} };
    console.log(req.files.boqExcel[0].relativePath);
    if (req.files?.boqExcel?.[0]) {
        const file = req.files.boqExcel[0];
        data.attachments.boqExcel = file.relativePath;
    }
    if (req.files?.boqPdf?.[0]) {
        const file = req.files.boqPdf[0];
        data.attachments.boqPdf = file.relativePath;
    }
    if (req.files?.priceAnalysisPdf?.[0]) {
        const file = req.files.priceAnalysisPdf[0];
        data.attachments.priceAnalysisPdf = file.relativePath;
    }
    if (req.files?.approvedDrawingsPdf?.[0]) {
        const file = req.files.approvedDrawingsPdf[0];
        data.attachments.approvedDrawingsPdf = file.relativePath;
    }
    if (req.files?.approvedDrawingsDwg?.[0]) {
        const file = req.files.approvedDrawingsDwg[0];
        data.attachments.approvedDrawingsDwg = file.relativePath;
    }
    if (req.files?.consultantApprovalPdf?.[0]) {
        const file = req.files.consultantApprovalPdf[0];
        data.attachments.consultantApprovalPdf = file.relativePath;
    }
    if (req.files?.companyProfilePdf?.[0]) {
        const file = req.files.companyProfilePdf[0];
        data.attachments.companyProfilePdf = file.relativePath;
    }
    const BillOfQuantitie = await billOfQuantitieModel.create(data);
    logger.info(`Company created: ${BillOfQuantitie._id}`);
    res.json({ success: true, data: BillOfQuantitie });
});

// get all projects
export const getAllBillOfQuantitie = catchAsync(async (req, res, next) => {
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
    if (req.organizationalUnitFilter) {
        query.organizationalUnit = req.organizationalUnitFilter;
    }
    const config = SUGGESTION_REGISTRY["projects"];

    // 🔹 regex search على globalFields
    if (search && config.globalFields?.length > 0) {
        const regex = new RegExp(search, "i");
        query.$or = config.globalFields.map((field) => ({
            [field]: regex
        }));
    }

    Object.assign(query, buildFilters(filters, config));

    const options = {
        page,
        limit,
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
        lean: true,
    };


    const bills = await billOfQuantitieModel.paginate({ ...query, isDeleted: false }, options);

    // 🔹 populate virtuals manually
    await billOfQuantitieModel.populate(bills.docs, {
        path: "project company organizationalUnit",
    });

    res.status(200).json({
        success: true,
        data: bills.docs,
        total: bills.totalDocs,
        limit: bills.limit,
        page: bills.page,
        totalPages: bills.totalPages,
    });
});
export const getSpecificBillOfQuantitie = catchAsync(async (req, res, next) => {
    try {
        const bill = await billOfQuantitieModel.findById(req.params.id)
            .populate({
                path: "organizationalUnit",
            })
            .populate({
                path: "project",
            })
            .populate({
                path: "company",
            })
            .populate({
                path: "changeLogs.changedBy",
            });

        if (!bill) return next(new AppError("bill not found", 404));

        res.json({ success: true, data: bill });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export const updateStepOfBillOfQuantitie = catchAsync(async (req, res, next) => {
    /*
     * body {
    notes : ["comment1","comment2"]
        } 
     * files {
        boqPdf : file
        }
    * params {
        id : id
        stepName : stepName //next | prev
        }
     */

    const { id, stepName } = req.params;
    const { notes } = req.body;
    const boqPdf = req.files?.boqPdf?.[0]?.relativePath;
    const boq = await billOfQuantitieModel.findById(id);
    if (!boq) return next(new AppError("BOQ not found", 404));

    const workflow = {
        REVIEW: ["TECHNICAL"],
        TECHNICAL: ["GENERAL", "REVIEW"],
        GENERAL: ["SENT", "REVIEW"]
    };
    const currentStatus = boq.status;
    let nextStatus;
    if (stepName === "next") {
        nextStatus = workflow[currentStatus]?.[0];
        if (!boqPdf) return next(new AppError("يجب رفع المستند ممضي", 400));
    } else if (stepName === "prev") {
        nextStatus = workflow[currentStatus]?.[1];
    } else {
        return next(new AppError("Invalid stepName", 400));
    }
    if (!nextStatus) return next(new AppError("لا يمكن تحديث الحالة", 400));
    // تحديث status
    boq.status = nextStatus;
    // إضافة التعديلات في changeLogs
    if (!boq.changeLogs) {
        boq.changeLogs = [];

    }
    boq.changeLogs.push({
        changedBy: req.user._id,
        fromStage: currentStatus,
        toStage: nextStatus,
        notes: notes,
        attachments: boqPdf ? { boqPdf } : {}
    });
    console.log(boq.changeLogs);

    await boq.save();
    res.status(200).json({ status: "success", data: boq });
});
