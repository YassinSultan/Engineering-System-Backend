import express from "express";
import { createContractPermission, createEstimatedCost, createFinancialAllocation, createProject, createWithdrawalPermission, getAllProjects, getSpecificProject, updateAerialPhotographyFile, updateContractPermission, updateEstimatedCost, updateFinancialAllocation, updatePresentationFile, updateProject, updateWithdrawalPermission } from "../controllers/project.controller.js";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { upload } from "../../../middleware/upload.js";

const cpUpload = upload.fields([
    { name: "networkBudgetFile", maxCount: 1 },
    { name: "siteHandoverFile", maxCount: 1 },
    { name: "estimatedCost.file", maxCount: 1 },
    { name: "securityApprovalFile", maxCount: 1 },
]);
const contractPermissionUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
const withdrawalPermissionUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
const financialAllocationUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
const estimatedCostUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
const presentationFileUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
const aerialPhotographyFileUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);

const router = express.Router();

router.post("/", cpUpload, restrictTo("projects:create"), createProject);
router.get("/", restrictTo("projects:read"), getAllProjects);
router.get("/:id", restrictTo("projects:read"), getSpecificProject);
router.patch("/:id", cpUpload, restrictTo("projects:update"), updateProject);
router.post("/:id/contract-permissions", contractPermissionUpload, restrictTo("projects:update"), createContractPermission);
router.patch(
    "/:projectId/contract-permissions/:permissionId",
    contractPermissionUpload,
    restrictTo("projects:update"),
    updateContractPermission
);
router.post("/:id/withdrawal-permissions", withdrawalPermissionUpload, restrictTo("projects:update"), createWithdrawalPermission);
router.patch(
    "/:projectId/withdrawal-permissions/:withdrawalId",
    withdrawalPermissionUpload,
    restrictTo("projects:update"),
    updateWithdrawalPermission
);
router.post("/:id/financial-allocations", financialAllocationUpload, restrictTo("projects:update"), createFinancialAllocation);
router.patch(
    "/:projectId/financial-allocations/:financialAllocationId",
    financialAllocationUpload,
    restrictTo("projects:update"),
    updateFinancialAllocation
);
router.post("/:id/estimated-costs", estimatedCostUpload, restrictTo("projects:update"), createEstimatedCost);
router.patch(
    "/:projectId/estimated-costs/:estimatedCostId",
    estimatedCostUpload,
    restrictTo("projects:update"),
    updateEstimatedCost
);
router.patch(
    "/:projectId/presentation-file",
    presentationFileUpload,
    restrictTo("projects:update"),
    updatePresentationFile
);
router.patch(
    "/:projectId/aerial-photography-file",
    aerialPhotographyFileUpload,
    restrictTo("projects:update"),
    updateAerialPhotographyFile
);


export default router;