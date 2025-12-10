// src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { AppError } from "../../../utils/AppError.js";

export const login = catchAsync(async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return next(new AppError("اسم المستخدم وكلمة المرور مطلوبة", 400));
    }

    const user = await User.findOne({ username }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError("اسم المستخدم او كلمة المرور غير صحيح", 401));
    }
    if (user.isDeleted) {
        return next(new AppError("حسابك محذوف", 401));
    }

    const token = jwt.sign(
        {
            id: user._id,
            branchId: user.branchId,
            permissions: user.permissions,
            role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ success: true, token });
});

// Super Admin only: assign permissions
export const assignPermissions = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.userId);
    if (!user) return next(new AppError("User not found", 404));

    user.permissions = req.body.permissions;
    await user.save();

    res.json({ success: true, data: user });
});

export const getUserByToken = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user });
});