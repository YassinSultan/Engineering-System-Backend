import User from "../models/user.model.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { AppError } from "../../../utils/AppError.js";
import { escapeRegExp } from "../../../utils/escapeRegExp.js";
import logger from "../../../utils/logger.js";
import { normalizePermissions, hasPermission } from "../../../utils/permission.utils.js";

export const createUser = catchAsync(async (req, res, next) => {
    let { permissions = [], role = "user", ...rest } = req.body;

    // سوبر أدمن فقط من ينشئ سوبر أدمن
    if (role === "super_admin" && req.user.role !== "super_admin") {
        return next(new AppError("غير مسموح بإنشاء سوبر أدمن", 403));
    }

    // تطبيع + منع منح صلاحيات أعلى
    if (role !== "super_admin") {
        if (req.user.role !== "super_admin") {
            const unauthorized = permissions.some(p => !hasPermission(req.user, p));
            if (unauthorized) {
                return next(new AppError("لا يمكنك منح صلاحية لا تملكها", 403));
            }
        }
        permissions = normalizePermissions(permissions);
    } else {
        permissions = [];
    }

    const newUser = await User.create({
        ...rest,
        role,
        permissions
    });

    res.status(201).json({ success: true, data: newUser });
});


export const getUsers = async (req, res) => {
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

        const result = await User.paginate(query, options);

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
        new AppError("Internal Server Error", 500);
    }
};

export const getUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found", 404));
    res.json({ success: true, data: user });
});

export const updateUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // ممنوع تعديل الصلاحيات من هذا الراوت نهائيًا
    if (req.body.permissions !== undefined) {
        return next(new AppError("لا يمكن تعديل الصلاحيات من هنا. استخدم المسار /permissions", 403));
    }

    // ممنوع تغيير الـ role إلا للسوبر أدمن
    if (req.body.role && req.user.role !== "super_admin") {
        return next(new AppError("غير مسموح بتغيير نوع المستخدم", 403));
    }

    const oldUser = await User.findById(id);
    if (!oldUser || oldUser.isDeleted) {
        return next(new AppError("المستخدم غير موجود", 404));
    }

    const updated = await User.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
    );

    res.json({ success: true, data: updated });
});

export const deleteUser = catchAsync(async (req, res, next) => {
    const currentUser = req.user;
    // svae delete user super admin
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) return next(new AppError("User not found", 404));
    if (user.role === "super_admin") {
        if (currentUser.role !== "super_admin") {
            return next(new AppError("لا يمكنك حذف سوبر ادمن الا السوبر ادمن", 403));
        }
    }
    // Soft delete
    await User.findByIdAndUpdate(req.params.id, { isDeleted: true });

    logger.info(`User soft-deleted: ${req.params.id}`);
    res.json({ success: true, message: "Deleted" });
});

export const hardDeleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found", 404));

    // Delete files
    // const filesToDelete = [];
    // if (company.securityApprovalFile) filesToDelete.push(company.securityApprovalFile);
    // if (company.companyDocuments) filesToDelete.push(...company.companyDocuments);
    // deleteFiles(filesToDelete);

    await User.findByIdAndDelete(req.params.id);

    logger.info(`User hard-deleted: ${req.params.id}`);
    res.json({ success: true, message: "Deleted" });
});


export const getFilterOptions = async (req, res) => {
    const field = req.params.field;

    // Validate allowed fields to prevent injection
    const allowedFields = [
        "fullName", "mainUnit", "commercialRegister", "subUnit",
        "specialization", "office", "username", "role",
        "permissions"];

    if (!allowedFields.includes(field)) {
        return res.status(400).json({ success: false, message: "Invalid field" });
    }

    const search = req.query.search || "";

    try {
        const regex = new RegExp(escapeRegExp(search), "i");
        const results = await User.distinct(field, {
            [field]: regex,
            isDeleted: false
        });

        // Sort and limit
        const sorted = results
            .filter(Boolean) // remove null/undefined
            .sort((a, b) => a.localeCompare(b, 'ar'))
            .slice(0, 20);

        res.json({ success: true, data: sorted });
    } catch (err) {
        console.error("Filter options error:", err);
        // use AppError to handle errors
        throw new AppError("Internal Server Error", 500);
    }
};

export const exportUsersToExcel = catchAsync(async (req, res, next) => {
    // 1. قراءة الفلاتر من الـ body (نفس الفلاتر التي تستخدمها في GET)
    const search = req.body.search || "";
    const filters = req.body.filters ? JSON.parse(req.body.filters) : {};

    // 2. بناء الـ query (نفس منطق getCompanies)
    const query = { isDeleted: false };

    if (search) {
        query.$text = { $search: search };
    }

    Object.keys(filters).forEach((field) => {
        if (filters[field]) {
            query[field] = { $regex: new RegExp(escapeRegExp(filters[field]), "i") };
        }
    });

    // 3. جلب البيانات (بدون pagination لأننا نريد كل النتائج)
    const users = await User.find(query)
        .select({
            // اختر الحقول التي تريدها في الـ Excel
            fullName: 1,
            mainUnit: 1,
            commercialRegister: 1,
            subUnit: 1,
            specialization: 1,
            office: 1,
            username: 1,
            role: 1,
            permissions: 1,
        })
        .sort({ createdAt: -1 })
        .lean(); // .lean() يعطي plain JS objects → أسرع

    if (!users.length) {
        return next(new AppError("لا توجد بيانات للتصدير", 404));
    }

    // 4. إنشاء Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Users");

    // 5. العناوين (بالعربي)
    sheet.columns = [
        { header: "اسم المستخدم", key: "fullName", width: 15 },
        { header: "الوحدة الرئيسية", key: "mainUnit", width: 15 },
        { header: "الوحدة الفرعية", key: "subUnit", width: 15 },
        { header: "التخصص", key: "specialization", width: 15 },
        { header: "المكتب", key: "office", width: 15 },
        { header: "ارقام الشركة", key: "phones", width: 15 },
        { header: "اسم المستخدم في تسجيل الدخول", key: "username", width: 15 },
        { header: "نوع المستخدم", key: "role", width: 15 },
        { header: "الصلاحيات", key: "permissions", width: 15 },
        { header: "تاريخ الانشاء", key: "createdAt", width: 15 },
    ];

    // 6. إضافة الصفوف
    users.forEach(c => {
        sheet.addRow({
            ...c,
            phones: Array.isArray(c.phones) ? c.phones.join(", ") : c.phones,
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

export const updateUserPermissions = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const currentUser = req.user;

    // جلب المستخدم المستهدف
    const targetUser = await User.findById(id).select("+permissions"); // + عشان يجيب الحقل حتى لو select: false
    if (!targetUser || targetUser.isDeleted) {
        return next(new AppError("المستخدم غير موجود", 404));
    }

    // ممنوع تعديل صلاحيات السوبر أدمن إلا من سوبر أدمن
    if (targetUser.role === "super_admin" && currentUser.role !== "super_admin") {
        return next(new AppError("لا يمكن تعديل صلاحيات السوبر أدمن", 403));
    }

    // ممنوع تعديل صلاحيات نفسك (أمان إضافي)
    if (targetUser._id.toString() === currentUser._id.toString()) {
        return next(new AppError("لا يمكنك تعديل صلاحيات حسابك الشخصي", 403));
    }

    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
        return next(new AppError("حقل permissions يجب أن يكون مصفوفة", 400));
    }

    // الأمان الأقوى: لا تسمح لأحد بمنح صلاحية لا يملكها
    if (currentUser.role !== "super_admin") {
        const unauthorized = permissions.some(perm => !hasPermission(currentUser, perm));
        if (unauthorized) {
            return next(new AppError("لا يمكنك منح صلاحية لا تملكها بنفسك", 403));
        }
    }

    // تطبيع الصلاحيات (إضافة :read تلقائيًا)
    const finalPermissions = normalizePermissions(permissions);

    // تحديث الصلاحيات فقط
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { permissions: finalPermissions },
        { new: true, runValidators: true }
    ).select("fullName username role permissions avatar");

    logger.info(`Permissions updated for user ${id} by ${currentUser.fullName} (${currentUser._id})`);

    res.json({
        success: true,
        message: "تم تحديث الصلاحيات بنجاح",
        data: updatedUser
    });
});