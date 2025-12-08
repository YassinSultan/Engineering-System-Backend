import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { AppError } from "../../../utils/AppError.js";
import logger from "../../../utils/logger.js";

export const getUserByToken = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user || user.isDeleted) return next(new AppError("User not found", 404));
    res.json({ success: true, data: user });
});

// update profile
export const updateProfile = catchAsync(async (req, res, next) => {
    const allowedFields = ['username', 'fullName', 'mainUnit', 'subUnit', 'phones'];

    const updates = {};
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    if (Object.keys(updates).length === 0) {
        return next(new AppError("No data provided to update", 400));
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true, select: '-password' }
    );

    if (!updatedUser) {
        return next(new AppError("User not found", 404));
    }

    logger.info(`User profile updated: ${updatedUser._id}`);
    res.json({ success: true, data: updatedUser });
});

// change password
export const changePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');
    if (!user || user.isDeleted) {
        return next(new AppError("User not found", 404));
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return next(new AppError("يجب إدخال كلمة المرور القديمة والجديدة", 400));
    }

    if (newPassword.length < 6) {
        return next(new AppError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل", 400));
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
        return next(new AppError("كلمة المرور القديمة غير صحيحة", 401));
    }

    user.password = newPassword;
    await user.save();

    // اختياري: توليد توكن جديد
    // const token = generateToken(user._id);

    res.json({
        success: true,
        message: "تم تغيير كلمة المرور بنجاح",
        // token, // لو عايز ترجعه
    });
});