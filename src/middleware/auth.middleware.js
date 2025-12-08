// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import { promisify } from "util";
import User from "../modules/User/models/user.model.js";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

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

// check if user has permission
export const restrictTo = (...permissions) => {
    return (req, res, next) => {
        if (req.user.role === "super_admin") return next(); // Super Admin bypass

        const hasPermission = permissions.some(perm => req.user.permissions.includes(perm));
        if (!hasPermission) {
            return next(new AppError("You do not have permission to perform this action", 403));
        }
        next();
    };
};

// 
export const branchFilter = (req, res, next) => {
    if (req.user.role === "super_admin") return next(); // Super Admin sees all

    // Inject branch filter into query
    if (!req.query) req.query = {};
    req.query.branchId = req.user.branchId;

    // For body in create/update, set branchId
    if (req.body) req.body.branchId = req.user.branchId;

    next();
};