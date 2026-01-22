import express from "express";

import { upload } from "../../../middleware/upload.js";
import { createBillOfQuantitie, getAllBillOfQuantitie, getSpecificBillOfQuantitie, updateStepOfBillOfQuantitie } from "../controllers/billOfQuantitie.controller.js";
import { resolveUnit, restrictTo, unitFilter } from "../../../middleware/auth.middleware.js";
import billOfQuantitieModel from "../models/billOfQuantitie.model.js";
import { resolveBoqStepPermission } from "../middlewares/resolveBoqStepPermission.middleware.js";

const router = express.Router();

const createUpload = upload.fields([
    { name: "boqExcel", maxCount: 1 },
    { name: "boqPdf", maxCount: 1 },
    { name: "priceAnalysisPdf", maxCount: 1 },
    { name: "approvedDrawingsPdf", maxCount: 1 },
    { name: "approvedDrawingsDwg", maxCount: 1 },
    { name: "consultantApprovalPdf", maxCount: 1 },
    { name: "companyProfilePdf", maxCount: 1 },
]);
const stepUpload = upload.fields([
    { name: "boqPdf", maxCount: 1 },
]);

router.post(
    "/",
    createUpload,
    resolveUnit({
        from: { location: "body", field: "organizationalUnit" },
        chain: [
            { isUnit: true } // ✅ الـ ID نفسه هو Unit
        ]
    }),
    restrictTo("billOfQuantitie:create:billOfQuantitie"),
    createBillOfQuantitie
);
router.get("/", restrictTo("billOfQuantitie:read"), unitFilter("billOfQuantitie:read"), getAllBillOfQuantitie);

router.get(
    "/:id",
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: billOfQuantitieModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("billOfQuantitie:read"),
    getSpecificBillOfQuantitie
);

router.patch(
    "/:id/:stepName",
    stepUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: billOfQuantitieModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    resolveBoqStepPermission,
    restrictTo((req) => req.requiredPermission),
    updateStepOfBillOfQuantitie
);

export default router;
