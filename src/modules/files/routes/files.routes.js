import express from "express";
import { downloadFile } from "../controllers/files.controller.js";
import { protect } from "../../../middleware/auth.middleware.js";
const router = express.Router();

// لو الملف محمي
router.get("/download/:filename", downloadFile);

export default router;
