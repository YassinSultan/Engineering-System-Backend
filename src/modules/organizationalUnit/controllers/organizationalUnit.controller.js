import { success } from "zod/v4";
import { AppError } from "../../../utils/AppError.js";
import organizationalUnitModel from "../models/organizationalUnit.model.js";
import userModel from "../../User/models/user.model.js";
import mongoose from "mongoose";

// create new unit
export const createUnit = async (req, res, next) => {
    try {
        const { name, type, parent } = req.body;

        // التحقق من أن الوحدات غير الرئيسية لها parent
        if (type !== "MAIN_UNIT" && !parent) {
            return next(new AppError("الوحدة الفرعية أو القسم يجب أن يكون لها وحدة أب", 400));
        }

        // للوحدة الرئيسية: لا parent مسموح
        if (type === "MAIN_UNIT" && parent) {
            return next(new AppError("الوحدة الرئيسية لا يمكن أن يكون لها وحدة أب", 400));
        }

        let path = [];

        if (parent) {
            // جلب الـ parent مرة واحدة فقط
            const parentUnit = await organizationalUnitModel.findById(parent);
            if (!parentUnit) {
                return next(new AppError("الوحدة الأب غير موجودة", 404));
            }

            // بناء الـ path بدءاً من الـ parent
            path = [...parentUnit.path, parentUnit._id];
        }

        const unit = await organizationalUnitModel.create({
            name,
            type,
            parent: parent || null,
            path,
        });

        res.json({ success: true, data: unit });
    } catch (error) {
        // إذا كان خطأ تكرار (duplicate key) مثلاً على اسم فريد
        if (error.code === 11000) {
            return next(new AppError("اسم الوحدة مكرر في هذا المستوى", 400));
        }
        // لو ال ID غير صحيح
        if (error.name === "CastError") {
            return next(new AppError("ID غير صحيح", 400));
        }
        return next(new AppError(error.message, 500));
    }
};

// Get Full Tree (Recursive)
export const getUnitsTree = async (req, res, next) => {
    try {
        const trees = await organizationalUnitModel.aggregate([
            {
                $match: { parent: null } // فقط الوحدات الرئيسية (جذور الشجرة)
            },
            {
                $graphLookup: {
                    from: "organizationalunits", // اسم المجموعة في قاعدة البيانات (عادة lowercase + plural)
                    startWith: "$_id",
                    connectFromField: "_id",
                    connectToField: "parent",
                    as: "children",
                    maxDepth: 20, // حد أقصى للعمق (اختياري، لمنع مشاكل في الأشجار الدورية)
                    // restrictSearchWithMatch: { } // يمكن إضافة فلتر إضافي إذا لزم
                }
            },
            {
                $sort: { name: 1 } // ترتيب الجذور حسب الاسم (اختياري)
            },
            {
                $project: {
                    name: 1,
                    type: 1,
                    parent: 1,
                    path: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    children: {
                        $map: {
                            input: "$children",
                            as: "child",
                            in: {
                                _id: "$$child._id",
                                name: "$$child.name",
                                type: "$$child.type",
                                parent: "$$child.parent",
                                path: "$$child.path",
                                createdAt: "$$child.createdAt",
                                updatedAt: "$$child.updatedAt",
                                children: "$$child.children" // التكرار يبني الشجرة كاملة
                            }
                        }
                    }
                }
            }
        ]);

        // إذا كنت تريد شجرة واحدة فقط (مثل افتراض وجود وحدة رئيسية واحدة)، يمكنك لفها في array
        // أو إرجاع trees مباشرة إذا كان هناك أكثر من جذر

        res.json({ success: true, data: trees });
    } catch (error) {
        console.error("Error in getUnitsTree:", error);
        return next(new AppError("فشل في جلب الهيكل التنظيمي", 500));
    }
};

// Delete Unit (مع Check)
export const deleteUnit = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. التحقق من صحة الـ ObjectId (اختياري لكن مفيد)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("معرف الوحدة غير صالح", 400));
        }

        // 2. جلب الوحدة للتحقق من وجودها
        const unit = await organizationalUnitModel.findById(id);
        if (!unit) {
            return next(new AppError("الوحدة التنظيمية غير موجودة", 404));
        }

        // 3. منع الحذف إذا كان لها أبناء مباشرين
        const hasChildren = await organizationalUnitModel.exists({ parent: id });
        if (hasChildren) {
            return next(new AppError("لا يمكن حذف الوحدة لأنها تحتوي على وحدات فرعية", 400));
        }

        // 4. منع الحذف إذا كان لها مستخدمين مرتبطين
        const hasUsers = await userModel.exists({ organizationalUnit: id });
        if (hasUsers) {
            return next(new AppError("لا يمكن حذف الوحدة لأنها مرتبطة بمستخدمين", 400));
        }

        // 5. تنفيذ الحذف
        await organizationalUnitModel.findByIdAndDelete(id);

        // 6. رد ناجح
        res.json({
            success: true,
            message: "تم حذف الوحدة بنجاح",
            data: { deletedId: id }
        });

    } catch (error) {
        // معالجة أخطاء غير متوقعة (مثل مشاكل قاعدة البيانات)
        console.error("Error deleting unit:", error);
        return next(new AppError("حدث خطأ أثناء حذف الوحدة", 500));
    }
};

// Update Unit
const updateDescendantsPath = async (unitId, newPath) => {
    const descendants = await organizationalUnitModel.find({
        path: unitId  // كل من لديه هذا الـ unit في path (أي أحفاد)
    });

    const bulkOps = descendants.map(desc => {
        // إزالة الأسلاف القديمة بعد هذا الـ unit وإضافة الجديدة
        const oldPathIndex = desc.path.findIndex(p => p.toString() === unitId.toString());
        const updatedPath = [
            ...newPath,
            ...desc.path.slice(oldPathIndex)
        ];

        return {
            updateOne: {
                filter: { _id: desc._id },
                update: { path: updatedPath }
            }
        };
    });

    if (bulkOps.length > 0) {
        await organizationalUnitModel.bulkWrite(bulkOps);
    }
};
export const updateUnit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body; // { name?, type?, parent? }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("معرف الوحدة غير صالح", 400));
        }
        if (updates.parent && !mongoose.Types.ObjectId.isValid(updates.parent)) {
            return next(new AppError("معرف الوحدة غير صالح", 400));
        }

        const unit = await organizationalUnitModel.findById(id);
        if (!unit) {
            return next(new AppError("الوحدة التنظيمية غير موجودة", 404));
        }

        const oldParent = unit.parent;
        const oldPath = unit.path;

        // تطبيق التحديثات
        if (updates.name) unit.name = updates.name;
        if (updates.type) {
            // اختياري: قيود على تغيير النوع
            if (unit.type === "MAIN_UNIT" && updates.type !== "MAIN_UNIT" && !updates.parent) {
                // هل مسموح تحويل رئيسية إلى فرعية؟ ربما لا
                return next(new AppError("لا يمكن تحويل الوحدة الرئيسية الى وحدة فرعية الا بتحديد الوحدة الرئيسة", 400));
            }
            unit.type = updates.type;
        }

        let newPath = oldPath;

        // معالجة تغيير الـ parent
        if (updates.hasOwnProperty("parent")) {
            const newParentId = updates.parent || null;

            // منع أن تكون الوحدة parent لنفسها
            if (newParentId && newParentId.toString() === id.toString()) {
                return next(new AppError("الوحدة لا يمكن أن تكون أبًا لنفسها", 400));
            }

            // الوحدة الرئيسية لا يمكن أن يكون لها parent
            if (unit.type === "MAIN_UNIT" && newParentId) {
                return next(new AppError("الوحدة الرئيسية لا يمكن أن يكون لها أب", 400));
            }

            // إذا كان هناك parent جديد
            if (newParentId) {
                const newParent = await organizationalUnitModel.findById(newParentId);
                if (!newParent) {
                    return next(new AppError("الوحدة الأب الجديدة غير موجودة", 404));
                }

                // منع الدورات: التحقق إذا كان الـ newParent أحد أحفاد الوحدة الحالية
                const isDescendant = await organizationalUnitModel.exists({
                    _id: newParentId,
                    path: id
                });
                if (isDescendant) {
                    return next(new AppError("لا يمكن نقل الوحدة لتكون تحت أحد أحفادها (دورة محظورة)", 400));
                }

                newPath = [...newParent.path, newParent._id];
            } else {
                // إذا أصبحت بدون parent (تصبح رئيسية) - فقط إذا كان type يسمح
                if (unit.type !== "MAIN_UNIT") {
                    return next(new AppError("فقط الوحدات الرئيسية يمكن أن تكون بدون أب", 400));
                }
                newPath = [];
            }

            unit.parent = newParentId;
            unit.path = newPath;
        }

        await unit.save();

        // تحديث path لكل الأحفاد إذا تغير path الوحدة
        if (updates.hasOwnProperty("parent") && oldParent?.toString() !== unit.parent?.toString()) {
            await updateDescendantsPath(id, [id, ...newPath]);
            // ملاحظة: الوحدة نفسها تم تحديث path لها بالفعل، والأحفاد يتم تحديثهم هنا
        }

        res.json({ success: true, data: unit });
    } catch (error) {
        console.error("Error updating unit:", error);
        return next(new AppError(error.message || "فشل في تحديث الوحدة", 500));
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

