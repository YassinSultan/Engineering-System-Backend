// routes/user.routes.js

import express from "express";
import { protect, restrictTo } from "../../../middleware/auth.middleware.js";
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
router.post("/", protect, restrictTo("users:create", true), createUser);

// تصدير إكسل
router.post("/export", protect, restrictTo("users:export"), exportUsersToExcel);

// جلب المستخدمين + فلترة
router.get("/", protect, restrictTo("users:read"), getUsers);
router.get("/filter/:field", protect, restrictTo("users:read"), getFilterOptions);
router.get("/:id", protect, restrictTo("users:read"), getUser);

// تعديل بيانات المستخدم العادية (الاسم، التليفون، الوحدة...)
router.patch("/:id", protect, restrictTo("users:update"), updateUser);

// جديد: راوت منفصل ومحمي جدًا لتعديل الصلاحيات فقط
router.patch(
    "/:id/permissions",
    protect,
    restrictTo("users:updatePermissions"),   // صلاحية نادرة جدًا (غالبًا السوبر أدمن فقط)
    updateUserPermissions
);

// الحذف
router.delete("/:id", protect, restrictTo("users:delete"), deleteUser);
router.delete("/hard/:id", protect, restrictTo("users:delete"), hardDeleteUser);

export default router;