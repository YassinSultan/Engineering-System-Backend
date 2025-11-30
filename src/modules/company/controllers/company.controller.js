import Company from "../models/company.model.js";
import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { deleteFiles } from "../../../utils/deleteFiles.js";
import logger from "../../../utils/logger.js";
import ExcelJS from "exceljs";
// create
export const createCompany = catchAsync(async (req, res, next) => {
    const data = { ...req.body };

    if (req.files.securityApprovalFile) {
        data.securityApprovalFile = req.files.securityApprovalFile[0].path;
    }
    if (req.files.companyDocuments) {
        data.companyDocuments = req.files.companyDocuments.map(f => f.path);
    }

    const company = await Company.create(data);
    logger.info(`Company created: ${company._id}`);
    res.json({ success: true, data: company });
});
// get all
// get all companies مع أقوى بحث في التاريخ
export const getCompanies = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 10, search = "", category } = req.query;

    const query = { deleted: false };

    // Full-Text Search
    if (search.trim()) {
        query.$text = { $search: search.trim() };
    }

    // فلتر بالتصنيف
    if (category) {
        query.companyCategory = category;
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: search.trim()
            ? { score: { $meta: "textScore" }, createdAt: -1 }
            : { createdAt: -1 },
        // ← أهم حاجة: نجيب الـ score عشان يشتغل الترتيب والـ searchScore
        ...(search.trim() && {
            projection: { score: { $meta: "textScore" } }
        })
    };

    const result = await Company.paginate(query, options);

    // تحويل الـ docs لـ plain objects + إضافة searchScore لو موجود
    const docs = result.docs.map(doc => {
        const plain = doc.toObject?.() ?? doc;  // أكثر أمانًا
        if (doc.score !== undefined) {
            plain.searchScore = doc.score;
        }
        return plain;
    });

    res.json({
        success: true,
        page: result.page,
        limit: result.limit,
        total: result.totalDocs,
        data: docs,
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

    // Delete files
    const filesToDelete = [];
    if (company.securityApprovalFile) filesToDelete.push(company.securityApprovalFile);
    if (company.companyDocuments) filesToDelete.push(...company.companyDocuments);
    deleteFiles(filesToDelete);

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
export const getFilterOptions = (field) =>
    catchAsync(async (req, res, next) => {
        const values = await Company.distinct(field, { deleted: false })
            .sort() // ترتيب أبجدي
            .collation({ locale: "en" }); // عشان يرتب عربي وإنجليزي صح

        // لو الحقل address، ممكن نستخرج المدينة بس (اختياري)
        if (field === "address") {
            const cities = [...new Set(
                values
                    .map(addr => addr?.split("-").pop()?.trim()) // آخر جزء بعد -
                    .filter(Boolean)
            )].sort();
            return res.json({ success: true, data: cities });
        }

        res.json({ success: true, data: values.filter(Boolean) }); // إزالة null/undefined
    });


/**
* تصدير الشركات إلى Excel
*/
export const exportToExcel = catchAsync(async (req, res, next) => {
    // 1. قراءة الفلاتر من الـ body (نفس الفلاتر التي تستخدمها في GET)
    const { search, category, fiscalYear, page, limit, ...rest } = req.body;

    // 2. بناء الـ query (نفس منطق getCompanies)
    const query = { deleted: false };

    if (search) {
        query.$text = { $search: search };
    }
    if (category) query.companyCategory = category;
    if (fiscalYear) query.fiscalYear = fiscalYear;

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