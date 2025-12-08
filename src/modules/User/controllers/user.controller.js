import User from "../models/user.model.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { AppError } from "../../../utils/AppError.js";

export const createUser = catchAsync(async (req, res) => {
    const data = { ...req.body };
    const user = await User.create(data);
    logger.info(`User created: ${user._id}`);
    res.json({ success: true, data: user });
});

export const getUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found", 404));
    res.json({ success: true, data: user });
});
