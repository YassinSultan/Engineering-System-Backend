// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import { promisify } from "util";
import User from "../modules/User/models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { hasAnyPermission } from "../utils/permission.utils.js";
import organizationalUnitModel from "../modules/organizationalUnit/models/organizationalUnit.model.js";
import mongoose from "mongoose";

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
export const unitFilter = (requiredAction) => {
    return catchAsync(async (req, res, next) => {
        const user = req.user;

        if (user.role === "SUPER_ADMIN") return next();

        const readPerm = user.permissions.find(p => p.action === requiredAction);
        if (!readPerm) return next(new AppError("غير مصرح لك برؤية أي بيانات", 403));

        let allowedUnits = [];

        if (readPerm.scope === "ALL") {
            return next(); // يشوف الكل
        }

        const userUnitId = user.organizationalUnit?._id || user.organizationalUnit;

        if (!userUnitId) {
            req.organizationalUnitFilter = { $in: [] };
            return next();
        }

        if (readPerm.scope === "OWN_UNIT") {
            allowedUnits.push(userUnitId);
        }

        if (readPerm.scope === "OWN_UNIT_AND_CHILDREN") {
            // جلب الوحدة بتاعة اليوزر مع الـ path
            const userUnit = await organizationalUnitModel.findById(userUnitId).select('path');
            if (!userUnit) {
                req.organizationalUnitFilter = { $in: [] };
                return next();
            }

            // البحث عن كل الوحدات اللي path بتاعها يحتوي على userUnitId
            const descendants = await organizationalUnitModel.find({
                path: userUnitId.toString()
            }).select('_id');

            allowedUnits.push(userUnitId);
            allowedUnits.push(...descendants.map(u => u._id));
        }

        if (readPerm.scope === "CUSTOM_UNITS") {
            allowedUnits.push(...readPerm.units);
        }

        if (allowedUnits.length === 0) {
            req.organizationalUnitFilter = { $in: [] };
            return next();
        }

        // إزالة التكرار
        allowedUnits = [...new Set(allowedUnits.map(id => id.toString()))];

        req.organizationalUnitFilter = {
            $in: allowedUnits.map(id => new mongoose.Types.ObjectId(id))
        };

        next();
    });
};