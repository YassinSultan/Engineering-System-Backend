import express from "express";
import {
    createCompany,
    getCompanies,
    getCompany,
    updateCompany,
    deleteCompany,
    getFilterOptions,
    exportToExcel,
    getCompaniesOptions,
} from "../controllers/company.controller.js";
import { upload } from "../../../middleware/upload.js";
import { validateCompany } from "../../../middleware/validators.js";
import { restrictTo, unitFilter } from "../../../middleware/auth.middleware.js";

const router = express.Router();

const cpUpload = upload.fields([
    { name: "securityApprovalFile", maxCount: 1 },
    { name: "companyDocuments", maxCount: 10 },
]);

router.post("/", cpUpload, validateCompany, createCompany);
router.post("/export", restrictTo("companies:export"), exportToExcel);
router.get("/", getCompanies);
router.get("/options", getCompaniesOptions);
router.get("/:id", getCompany);
router.patch("/:id", cpUpload, updateCompany);
router.delete("/hard/:id", deleteCompany);
router.delete("/:id", deleteCompany);

// جديد: جلب القيم الفريدة للـ filters
router.get("/filter/:field", restrictTo("companies:read"), getFilterOptions);

export default router;