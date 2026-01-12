import express from "express";
import { createContractPermission, createEstimatedCost, createFinancialAllocation, createProject, createWithdrawalPermission, getAllProjects, getSpecificProject, updateAerialPhotographyFile, updateContractPermission, updateEstimatedCost, updateFinancialAllocation, updatePresentationFile, updateProject, updateWithdrawalPermission } from "../controllers/project.controller.js";
import { resolveUnit, restrictTo, unitFilter } from "../../../middleware/auth.middleware.js";
import { upload } from "../../../middleware/upload.js";
import { model } from "mongoose";
import ProjectModel from "../models/Project.model.js";

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
// اضافة مشروع
router.post(
    "/",
    cpUpload,
    resolveUnit({
        from: { location: "body", field: "organizationalUnit" },
        chain: [
            { isUnit: true } // ✅ الـ ID نفسه هو Unit
        ]
    }),
    restrictTo("projects:create:project"),
    createProject
);
// عرض كل المشاريع
router.get("/", restrictTo("projects:read"), unitFilter("projects:read"), getAllProjects);
// عرض مشروع محدد
router.get(
    "/:id",
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:read"),
    getSpecificProject
);
// تحديث مشروع
router.patch(
    "/:id",
    cpUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:project"),
    updateProject
);
// اضافة صلاحيات تعاقد
router.post(
    "/:id/contract-permissions",
    contractPermissionUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:contractPermission"),
    createContractPermission
);
// تحديث صلاحيات تعاقد
router.patch(
    "/:projectId/contract-permissions/:permissionId",
    contractPermissionUpload,
    resolveUnit({
        from: { location: "params", field: "projectId" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:contractPermission"),
    updateContractPermission
);
// اضافة صلاحيات صرف
router.post(
    "/:id/withdrawal-permissions",
    withdrawalPermissionUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:withdrawalPermission"),
    createWithdrawalPermission
);
// تحديث صلاحيات صرف
router.patch(
    "/:projectId/withdrawal-permissions/:withdrawalId",
    withdrawalPermissionUpload,
    resolveUnit({
        from: { location: "params", field: "projectId" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:withdrawalPermission"),
    updateWithdrawalPermission
);
// اضافة تخصص مالي
router.post(
    "/:id/financial-allocations",
    financialAllocationUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:financialAllocation"),
    createFinancialAllocation
);
// تحديث تخصص مالي
router.patch(
    "/:projectId/financial-allocations/:financialAllocationId",
    financialAllocationUpload,
    resolveUnit({
        from: { location: "params", field: "projectId" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:financialAllocation"),
    updateFinancialAllocation
);
// اضافة تكلفة تقديرية
router.post(
    "/:id/estimated-costs",
    estimatedCostUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:estimatedCost"),
    createEstimatedCost
);
// تحديث تكلفة تقديرية
router.patch(
    "/:projectId/estimated-costs/:estimatedCostId",
    estimatedCostUpload,
    resolveUnit({
        from: { location: "params", field: "projectId" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:estimatedCost"),
    updateEstimatedCost
);
// ملف العرض
router.patch(
    "/:projectId/presentation-file",
    presentationFileUpload,
    resolveUnit({
        from: { location: "params", field: "projectId" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:presentationFile"),
    updatePresentationFile
);
// ملف التصوير 
router.patch(
    "/:projectId/aerial-photography-file",
    aerialPhotographyFileUpload,
    resolveUnit({
        from: { location: "params", field: "projectId" },
        chain: [
            { model: ProjectModel },                 // start
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:aerialPhotographyFile"),
    updateAerialPhotographyFile
);


export default router;