import express from "express";
import { createProject, getAllProjects, getSpecificProject, updateProject } from "../controllers/project.controller.js";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { upload } from "../../../middleware/upload.js";

const cpUpload = upload.fields([
    { name: "networkBudgetFile", maxCount: 1 },
    { name: "siteHandoverFile", maxCount: 1 },
    { name: "estimatedCost.file", maxCount: 1 },
    { name: "securityApprovalFile", maxCount: 1 },
]);

const router = express.Router();

router.post("/", cpUpload, restrictTo("projects:create"), createProject);
router.get("/", restrictTo("projects:read"), getAllProjects);
router.get("/:id", restrictTo("projects:read"), getSpecificProject);
router.patch("/:id", cpUpload, restrictTo("projects:update"), updateProject);


export default router;