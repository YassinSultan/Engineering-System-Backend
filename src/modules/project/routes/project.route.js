import express from "express";
import { createProject, getAllProjects } from "../controllers/project.controller.js";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { upload } from "../../../middleware/upload.js";

const cpUpload = upload.fields([
    { name: "networkBudgetFile", maxCount: 1 },
    { name: "siteHandoverFile", maxCount: 1 },
    { name: "estimatedCost.file", maxCount: 1 },
    { name: "securityApprovalFile", maxCount: 1 },
]);

const router = express.Router();

router.post("/", cpUpload, createProject);
router.get("/", restrictTo("projects:read"), getAllProjects);


export default router;