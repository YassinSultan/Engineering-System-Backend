// src/modules/auth/routes/auth.routes.js
import express from "express";


import { assignPermissions, createUser, getUserByToken, login } from "../controllers/auth.controller.js";
import { protect, restrictTo } from "../../../middleware/auth.middleware.js";
import { get } from "mongoose";

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, getUserByToken);
router.post("/users", protect, restrictTo("users:create"), createUser);
router.patch("/users/:userId/permissions", protect, restrictTo("users:edit"), assignPermissions);

export default router;