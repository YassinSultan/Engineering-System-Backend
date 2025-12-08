import express from "express";

import { protect, restrictTo } from "../../../middleware/auth.middleware.js";
import { changePassword, updateProfile, getUserByToken } from "../controllers/profile.controller.js";


const router = express.Router();

router.get("/", protect, getUserByToken);
router.patch("/", protect, updateProfile);
router.patch("/change-password", protect, changePassword);

export default router;
