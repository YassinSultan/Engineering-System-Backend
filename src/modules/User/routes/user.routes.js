// routes/user.routes.js

import express from "express";
import { protect, restrictTo, unitFilter } from "../../../middleware/auth.middleware.js";
import {
    createUser,
    getUser,
    getUsers,
    exportUsersToExcel,
    updateUser,                    // تعديل البيانات العادية فقط
    updateUserPermissions,         // جديد: تعديل الصلاحيات فقط
    hardDeleteUser,
    deleteUser,
    getFilterOptions
} from "../controllers/user.controller.js";

const router = express.Router();

// إنشاء مستخدم
router.post("/", restrictTo("users:create", true), createUser);

// تصدير إكسل
router.post("/export", restrictTo("users:export"), unitFilter("users:read"), exportUsersToExcel);

// جلب المستخدمين + فلترة
router.get("/", restrictTo("users:read"), unitFilter("users:read"), getUsers);
router.get("/filter/:field", protect, restrictTo("users:read"), getFilterOptions);
router.get("/:id", protect, restrictTo("users:read", true), getUser);

// تعديل بيانات المستخدم العادية (الاسم، التليفون، الوحدة...)
router.patch("/:id", protect, restrictTo("users:update", true), updateUser);

// جديد: راوت منفصل ومحمي جدًا لتعديل الصلاحيات فقط
router.patch(
    "/:id/permissions",
    protect,
    restrictTo("users:updatePermissions"),   // صلاحية نادرة جدًا (غالبًا السوبر أدمن فقط)
    updateUserPermissions
);

// الحذف
router.delete("/:id", protect, restrictTo("users:delete", true), deleteUser);
router.delete("/hard/:id", protect, restrictTo("users:delete", true), hardDeleteUser);

export default router;