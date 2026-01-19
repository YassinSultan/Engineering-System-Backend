
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