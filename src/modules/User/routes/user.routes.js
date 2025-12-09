import express from "express";



import { protect, restrictTo } from "../../../middleware/auth.middleware.js";
import { createUser, getUser, getUsers, exportUsersToExcel, updateUser, hardDeleteUser, deleteUser, getFilterOptions } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/", protect, restrictTo("users:create"), createUser);
router.post("/export", restrictTo("users:export"), exportUsersToExcel);
router.get("/", protect, restrictTo("users:show"), getUsers);
router.get("/:id", protect, restrictTo("users:show"), getUser);
router.patch("/:id", protect, restrictTo("users:edit"), updateUser);
router.delete("/hard/:id", protect, restrictTo("users:delete"), hardDeleteUser);
router.delete("/:id", protect, restrictTo("users:delete"), deleteUser);
// جديد: جلب القيم الفريدة للـ filters
router.get("/filter/:field", protect, restrictTo("users:show"), getFilterOptions);



export default router;