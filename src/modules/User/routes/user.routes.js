import express from "express";



import { protect, restrictTo } from "../../../middleware/auth.middleware.js";
import { createUser, getUser, getUsers } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/", protect, restrictTo("users:create"), createUser);
router.get("/", protect, restrictTo("users:show"), getUsers);
router.get("/:id", protect, restrictTo("users:show"), getUser);


export default router;