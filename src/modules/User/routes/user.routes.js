import express from "express";



import { protect, restrictTo } from "../../../middleware/auth.middleware.js";
import { createUser } from "../controllers/auth.controller.js";
import { getUser } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/", protect, restrictTo("users:create"), createUser);
router.get("/:id", protect, restrictTo("users:create"), getUser);


export default router;