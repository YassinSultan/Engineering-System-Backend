import User from "../models/user.model.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { AppError } from "../../../utils/AppError.js";


export const createUser = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body);
    res.json({ success: true, data: newUser });
});

export const getUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found", 404));
    res.json({ success: true, data: user });
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
