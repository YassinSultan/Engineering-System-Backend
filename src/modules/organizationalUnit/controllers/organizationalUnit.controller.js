import { success } from "zod/v4";
import { AppError } from "../../../utils/AppError.js";
import organizationalUnitModel from "../models/organizationalUnit.model.js";
import { tr } from "zod/v4/locales";



// create new unit
export const createUnit = async (req, res, next) => {
    try {
        const { name, type, parent } = req.body;

        // لو فيه parent نتأكد إنه موجود
        if (parent) {
            const parentUnit = await organizationalUnitModel.findById(parent);
            if (!parentUnit) {
                return next(new AppError("Parent Not Found", 404));
            }
        }

        const unit = await organizationalUnitModel.create({
            name,
            type,
            parent: parent || null,
        });

        res.json({ success: true, data: unit });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

// Get All
export const getAllUnits = async (req, res, next) => {
    try {
        const units = await organizationalUnitModel.find()
            .populate("parent", "name type")
            .sort({ createdAt: 1 });

        res.json({ success: true, data: units });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Unit By ID
export const getUnitById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid ID", 400));
        }

        const unit = await organizationalUnitModel.findById(id).populate(
            "parent",
            "name type"
        );

        if (!unit) {
            return next(new AppError("Unit not found", 404));
        }

        res.json({ success: true, data: unit });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

// Get Children Units
export const getChildrenUnits = async (req, res, next) => {
    try {
        const { parentId } = req.params;

        const children = await organizationalUnitModel.find({
            parent: parentId,
        }).sort({ createdAt: 1 });

        res.json({ success: true, data: children });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};
// Get Full Tree (Recursive)
export const getUnitsTree = async (req, res, next) => {
    try {
        const units = await organizationalUnitModel.find().lean();

        const buildTree = (parentId = null) => {
            return units
                .filter((u) => String(u.parent) === String(parentId))
                .map((u) => ({
                    ...u,
                    children: buildTree(u._id),
                }));
        };

        res.json({ success: true, data: buildTree() });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};
// Update Unit
export const updateUnit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, type, parent } = req.body;

        const unit = await organizationalUnitModel.findById(id);
        if (!unit) {
            return next(new AppError("Unit not found", 404));
        }

        // منع الوحدة تبقى parent لنفسها
        if (parent && parent === id) {
            return next(new AppError("Unit cannot be its own parent", 400));
        }

        unit.name = name ?? unit.name;
        unit.type = type ?? unit.type;
        unit.parent = parent ?? unit.parent;

        await unit.save();

        res.json({ success: true, data: unit });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

// Move Unit (Change Parent)
export const moveUnit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newParent } = req.body;

        const unit = await organizationalUnitModel.findById(id);
        if (!unit) {
            return next(new AppError("Unit not found", 404));
        }

        if (newParent) {
            const parentUnit = await organizationalUnitModel.findById(newParent);
            if (!parentUnit) {
                return next(new AppError("New parent not found", 404));
            }
        }

        unit.parent = newParent || null;
        await unit.save();

        res.json({ success: true, data: unit });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

// Delete Unit (مع Check)
export const deleteUnit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const hasChildren = await organizationalUnitModel.exists({ parent: id });
        if (hasChildren) {
            return next(new AppError("لا يمكن حذف وحدة لديها وحدات فرعية", 404));
        }

        await organizationalUnitModel.findByIdAndDelete(id);

        res.json({ success: true, message: "تم حذف الوحدة", data: id });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};
