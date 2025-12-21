import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import ownerEntityModel from "../models/ownerEntity.model.js";



export const createOwnerEntity = catchAsync(async (req, res, next) => {

    try {
        const curentUser = req.user;

        const ownerEntity = await ownerEntityModel.create({ ...req.body, createBy: curentUser._id });
        res.json({ success: true, data: ownerEntity });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});
export const getOwnerEntity = catchAsync(async (req, res, next) => {
    try {
        const { search = "", page = 1, limit = 10 } = req.query;

        // pagination + search
        const query = {
            isDeleted: false,
            name: { $regex: search, $options: "i" } // بحث جزئي case-insensitive
        };

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 }
        };

        const result = await ownerEntityModel.paginate(query, options);

        // تحويل البيانات للـ frontend
        const formattedOptions = result.docs.map(item => ({ value: item._id, label: item.name }));

        res.json({
            success: true,
            results: formattedOptions,
            hasMore: result.hasNextPage  // غيّر has_more إلى hasMore
        });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});