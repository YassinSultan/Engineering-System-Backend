// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import { promisify } from "util";
import User from "../modules/User/models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { hasAnyPermission } from "../utils/permission.utils.js";
import organizationalUnitModel from "../modules/organizationalUnit/models/organizationalUnit.model.js";
import mongoose from "mongoose";


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

export const resolveUnit = ({ from, chain }) => {
    return catchAsync(async (req, res, next) => {
        const startId = req[from.location]?.[from.field];

        if (!startId) {
            return next(new AppError(`${from.field} مطلوب`, 400));
        }

        // 🔹 حالة مباشرة: الـ ID نفسه Unit
        if (chain[0].isUnit && !chain[0].model) {
            req.resourceUnitId = Array.isArray(startId) ? startId : [startId];
            return next();
        }

        // 🔹 البداية
        if (!chain[0]?.model) {
            return next(new AppError("resolveUnit: start model is missing", 500));
        }

        let currentDoc = await chain[0].model.findById(startId);

        if (!currentDoc) {
            return next(new AppError("المورد غير موجود", 404));
        }

        // 🔹 traversal
        for (let i = 1; i < chain.length; i++) {
            const step = chain[i];

            const refId = currentDoc[step.ref];

            if (!refId) {
                return next(new AppError("سلسلة الربط غير مكتملة", 500));
            }

            // ✅ وصلنا للوحدة
            if (step.isUnit) {
                req.resourceUnitId = Array.isArray(refId) ? refId : [refId];
                return next();
            }

            if (!step.model) {
                return next(
                    new AppError(`resolveUnit: model missing at step ${i}`, 500)
                );
            }

            currentDoc = await step.model.findById(refId);

            if (!currentDoc) {
                return next(new AppError("المورد المرتبط غير موجود", 404));
            }
        }

        return next(new AppError("لم يتم الوصول إلى الوحدة التنظيمية", 500));
    });
};


export const restrictTo = (requiredActions) => {
    const actions = Array.isArray(requiredActions)
        ? requiredActions
        : [requiredActions];

    return async (req, res, next) => {
        try {
            if (req.user.role === "SUPER_ADMIN") return next();

            const allowed = await hasAnyPermission(
                req.user,
                actions,
                req.resourceUnitId ?? null
            );

            if (!allowed) {
                return next(
                    new AppError("ليس لديك صلاحية لتنفيذ هذا الإجراء", 403)
                );
            }

            next();
        } catch (err) {
            next(err);
        }
    };
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