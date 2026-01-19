import Company from "../models/company.model.js";
import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { deleteFiles } from "../../../utils/deleteFiles.js";
import logger from "../../../utils/logger.js";
import ExcelJS from "exceljs";
import { escapeRegExp } from "../../../utils/escapeRegExp.js";
import companyModel from "../models/company.model.js";
// create
export const createCompany = catchAsync(async (req, res, next) => {
    const data = { ...req.body };

    if (req.files?.securityApprovalFile?.[0]) {
        const file = req.files.securityApprovalFile[0];
        data.securityApprovalFile = `uploads/${file.filename}`;
    }
    if (req.files?.companyDocuments?.length) {
        data.companyDocuments = req.files.companyDocuments.map(
            file => `uploads/${file.filename}`
        );
    }

    const company = await Company.create(data);
    logger.info(`Company created: ${company._id}`);
    res.json({ success: true, data: company });
});
// get all
// get all companies مع أقوى بحث في التاريخ
export const getCompanies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder || "desc";
        let filters = {};

        if (req.query.filters) {
            try {
                filters = JSON.parse(req.query.filters);
            } catch (e) {
                return res.status(400).json({ success: false, message: "Invalid filters format" });
            }
        }

        const query = { deleted: false };

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

        const result = await Company.paginate(query, options);

        res.json({
            success: true,
            data: result.docs,
            total: result.totalDocs,
            limit: result.limit,
            page: result.page,
            totalPages: result.totalPages,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// get projects for select (lightweight)
export const getCompaniesOptions = catchAsync(async (req, res, next) => {
    const { search = "", page = 1, limit = 10 } = req.query;

    const query = { deleted: false };

    if (search) {
        query.companyName = { $regex: search, $options: "i" };
    }

    const options = {
        page: Number(page),
        limit: Number(limit),
        sort: { createdAt: -1 },
        select: "companyName",
        lean: true,
    };

    const result = await companyModel.paginate(query, options);

    const formattedOptions = result.docs.map(item => ({
        value: item._id,
        label: item.companyName,
    }));

    res.status(200).json({
        success: true,
        results: formattedOptions,
        hasMore: result.hasNextPage,
    });
});

// get one
export const getCompany = catchAsync(async (req, res, next) => {
    const company = await Company.findById(req.params.id);
    if (!company) return next(new AppError("Company not found", 404));
    res.json({ success: true, data: company });
});
// update
export const updateCompany = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const oldCompany = await Company.findById(id);
    if (!oldCompany || oldCompany.deleted) {
        return next(new AppError("Company not found", 404));
    }

    // البيانات الجديدة (بس اللي جاية في الـ body)
    const updates = { ...req.body };

    // === معالجة الملفات (زي ما كنت بتعمل) ===
    if (req.files?.securityApprovalFile) {
        updates.securityApprovalFile = req.files.securityApprovalFile[0].path;
        if (oldCompany.securityApprovalFile) {
            deleteFiles([oldCompany.securityApprovalFile]);
        }
    }

    if (req.files?.companyDocuments) {
        updates.companyDocuments = req.files.companyDocuments.map(f => f.path);

        // احذف القديم اللي مش موجود في الجديد
        const oldPaths = oldCompany.companyDocuments || [];
        const newPaths = updates.companyDocuments;
        const toDelete = oldPaths.filter(p => !newPaths.includes(p));
        deleteFiles(toDelete);
    }

    // === التحديث الجزئي الآمن (بس الحقول اللي جاية) ===
    const updated = await Company.findByIdAndUpdate(
        id,
        { $set: updates },  // ← الأهم: $set مش تمرير الـ object مباشرة
        { new: true, runValidators: true }
    );

    logger.info(`Company partially updated: ${id}`);
    res.json({ success: true, data: updated });
});
// soft delete
export const deleteCompany = catchAsync(async (req, res, next) => {
    const company = await Company.findById(req.params.id);
    if (!company) return next(new AppError("Company not found", 404));

    // Soft delete
    await Company.findByIdAndUpdate(req.params.id, { deleted: true });

    // // Delete files
    // const filesToDelete = [];
    // if (company.securityApprovalFile) filesToDelete.push(company.securityApprovalFile);
    // if (company.companyDocuments) filesToDelete.push(...company.companyDocuments);
    // deleteFiles(filesToDelete);

    logger.info(`Company soft-deleted: ${req.params.id}`);
    res.json({ success: true, message: "Deleted" });
});

// hard delete
export const hardDeleteCompany = catchAsync(async (req, res, next) => {
    const company = await Company.findById(req.params.id);
    if (!company) return next(new AppError("Company not found", 404));

    // Delete files
    const filesToDelete = [];
    if (company.securityApprovalFile) filesToDelete.push(company.securityApprovalFile);
    if (company.companyDocuments) filesToDelete.push(...company.companyDocuments);
    deleteFiles(filesToDelete);

    await Company.findByIdAndDelete(req.params.id);

    logger.info(`Company hard-deleted: ${req.params.id}`);
    res.json({ success: true, message: "Deleted" });
});

// دالة عامة ترجع القيم الفريدة لأي حقل
// في controller
export const getFilterOptions = async (req, res) => {
    const field = req.params.field;

    // Validate allowed fields to prevent injection
    const allowedFields = [
        "companyCode", "companyName", "commercialRegister", "securityApprovalNumber",
        "companyCategory", "companyBrand", "companyActivity", "ownerName",
        "ownerNID", "representativeName", "legalForm", "fiscalYear"
    ];

    if (!allowedFields.includes(field)) {
        return res.status(400).json({ success: false, message: "Invalid field" });
    }

    const search = req.query.search || "";

    try {
        const regex = new RegExp(escapeRegExp(search), "i");
        const results = await Company.distinct(field, {
            [field]: regex,
            deleted: false
        });

        // Sort and limit
        const sorted = results
            .filter(Boolean) // remove null/undefined
            .sort((a, b) => a.localeCompare(b, 'ar'))
            .slice(0, 20);

        res.json({ success: true, data: sorted });
    } catch (err) {
        console.error("Filter options error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
/**
* تصدير الشركات إلى Excel
*/
export const exportToExcel = catchAsync(async (req, res, next) => {
    // 1. قراءة الفلاتر من الـ body (نفس الفلاتر التي تستخدمها في GET)
    const search = req.body.search || "";
    const filters = req.body.filters ? JSON.parse(req.body.filters) : {};

    // 2. بناء الـ query (نفس منطق getCompanies)
    const query = { deleted: false };

    if (search) {
        query.$text = { $search: search };
    }

    Object.keys(filters).forEach((field) => {
        if (filters[field]) {
            query[field] = { $regex: new RegExp(escapeRegExp(filters[field]), "i") };
        }
    });

    // 3. جلب البيانات (بدون pagination لأننا نريد كل النتائج)
    const companies = await Company.find(query)
        .select({
            // اختر الحقول التي تريدها في الـ Excel
            companyCode: 1,
            commercialRegister: 1,
            securityApprovalNumber: 1,
            securityApprovalDate: 1,
            fiscalYear: 1,
            companyName: 1,
            companyCategory: 1,
            companyBrand: 1,
            companyActivity: 1,
            ownerName: 1,
            ownerNID: 1,
            representativeName: 1,
            address: 1,
            phones: 1,
            fax: 1,
            email: 1,
            legalForm: 1,
            securityFileNumber: 1,
            securityApprovalFile: 1,
            companyDocuments: 1,
            createdAt: 1,
        })
        .sort({ createdAt: -1 })
        .lean(); // .lean() يعطي plain JS objects → أسرع

    if (!companies.length) {
        return next(new AppError("لا توجد بيانات للتصدير", 404));
    }

    // 4. إنشاء Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("الشركات");

    // 5. العناوين (بالعربي)
    sheet.columns = [
        { header: "كود الشركة", key: "companyCode", width: 15 },
        { header: "رقم السجل", key: "commercialRegister", width: 15 },
        { header: "رقم الموافقة الامنية", key: "securityApprovalNumber", width: 15 },
        { header: "تاريخ الموافقة الامنية", key: "securityApprovalDate", width: 15 },
        { header: "العام المالي", key: "fiscalYear", width: 15 },
        { header: "اسم الشركة", key: "companyName", width: 15 },
        { header: "فئة الشركة", key: "companyCategory", width: 15 },
        { header: "السمة التجارية للشركة", key: "companyBrand", width: 15 },
        { header: "نشاط الشركة", key: "companyActivity", width: 15 },
        { header: "مالك الشركة", key: "ownerName", width: 15 },
        { header: "الرقم القومي لمالك الشركة", key: "ownerNID", width: 15 },
        { header: "اسم المندوب", key: "representativeName", width: 15 },
        { header: "عنوان الشركة", key: "address", width: 15 },
        { header: "تليفونات الشركة", key: "phones", width: 15 },
        { header: "فاكس الشركة", key: "fax", width: 15 },
        { header: "بريد الشركة", key: "email", width: 15 },
        { header: "الشكل القانوني", key: "legalForm", width: 15 },
        { header: "رقم الملف بمكتب الامن", key: "securityFileNumber", width: 15 },
        { header: "ملف الموافقة الامنية", key: "securityApprovalFile", width: 15 },
        { header: "اوراق الشركة", key: "companyDocuments", width: 15 },
        { header: "تاريخ الانشاء", key: "createdAt", width: 15 },
    ];

    // 6. إضافة الصفوف
    companies.forEach(c => {
        sheet.addRow({
            ...c,
            phones: Array.isArray(c.phones) ? c.phones.join(", ") : c.phones,
            companyDocuments: Array.isArray(c.companyDocuments) ? c.companyDocuments.join(", ") : c.companyDocuments,
            securityApprovalDate: c.securityApprovalDate
                ? new Date(c.securityApprovalDate).toLocaleDateString("ar-EG")
                : "",
            createdAt: new Date(c.createdAt).toLocaleDateString("ar-EG"),
        });
    });

    // 7. تنسيق الـ Header
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1f4e79" },
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // 8. إرسال الملف
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=companies_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
});