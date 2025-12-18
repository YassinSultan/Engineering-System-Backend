// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import { promisify } from "util";
import User from "../modules/User/models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { hasAnyPermission } from "../utils/permission.utils.js";

// chick if user is logged in
export const protect = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new AppError("You are not logged in", 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError("The user no longer exists", 401));
    }

    req.user = currentUser;
    next();
});

/**
 * Middleware للتحقق من الصلاحيات مع مراعاة الـ scope والـ units
 * 
 * استخدام:
 * restrictTo("companies:read")          → للعمليات التي لا تحتاج resource معين (مثل list عام أو create)
 * restrictTo("companies:read", true)    → يتطلب استخراج unitId من params/body/query
 * 
 * @param {string|string[]} requiredActions
 * @param {boolean} [requireResourceUnit=false] - هل نحتاج إلى unitId للـ resource؟
 */
export const restrictTo = (requiredActions, requireResourceUnit = false) => {
    const actions = Array.isArray(requiredActions) ? requiredActions : [requiredActions];

    return catchAsync(async (req, res, next) => {
        const user = req.user;

        let resourceUnitId = null;

        if (requireResourceUnit) {
            // البحث عن unitId في الأماكن الشائعة
            resourceUnitId = req.params.id || req.params.unitId || req.body.organizationalUnit || req.query.organizationalUnit;

            if (!resourceUnitId) {
                return next(new AppError("لا يمكن تحديد الوحدة التنظيمية للعملية", 400));
            }
        }

        const allowed = hasAnyPermission(user, actions, resourceUnitId);

        if (!allowed) {
            return next(new AppError("ليس لديك صلاحية لتنفيذ هذا الإجراء", 403));
        }

        next();
    });
};

/**
 * فلتر الوحدة التنظيمية (للمستخدمين العاديين)
 */
export const unitFilter = (modelField = "organizationalUnit") => {
    return catchAsync(async (req, res, next) => {
        if (req.user.role === "SUPER_ADMIN") return next();

        const user = req.user;
        if (!req.query) req.query = {};

        // ابحث عن صلاحية read للـ resource الحالي (نستنتجها من الـ route لو عايزين، لكن دلوقتي نفترض إنها موجودة)
        // أو نعتمد على إن الـ restrictTo هيمنع لو مفيش صلاحية أصلاً

        let allowedUnits = [user.organizationalUnit];

        // ابحث عن أي صلاحية read لها CUSTOM_UNITS أو ALL
        const readPerms = user.permissions.filter(p =>
            p.action.endsWith(":read") || p.action.endsWith(":update") || p.action.endsWith(":delete")
        );

        for (const perm of readPerms) {
            if (perm.scope === "ALL") {
                return next(); // لو عنده ALL → مفيش فلتر خالص
            }
            if (perm.scope === "CUSTOM_UNITS") {
                allowedUnits.push(...perm.units);
            }
        }

        // إزالة التكرار
        allowedUnits = [...new Set(allowedUnits.map(id => id.toString()))];

        // تطبيق الفلتر
        req.query[modelField] = { $in: allowedUnits };

        // للإنشاء: اجبار اليوزر يضيف في قسمه فقط (اختياري)
        if (req.method === "POST" || req.method === "PATCH") {
            if (req.body && req.body[modelField]) {
                if (!allowedUnits.includes(req.body[modelField].toString())) {
                    return next(new AppError("لا يمكنك إضافة/تعديل في قسم غير مسموح لك", 403));
                }
            } else {
                req.body[modelField] = user.organizationalUnit; // افتراضي قسمه
            }
        }

        next();
    });
};