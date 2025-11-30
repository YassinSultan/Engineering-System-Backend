import express from "express";
import {
    createCompany,
    getCompanies,
    getCompany,
    updateCompany,
    deleteCompany,
    getFilterOptions,
    exportToExcel,
} from "../controllers/company.controller.js";
import { upload } from "../../../middleware/upload.js";
import { validateCompany } from "../../../middleware/validators.js";

const router = express.Router();

const cpUpload = upload.fields([
    { name: "securityApprovalFile", maxCount: 1 },
    { name: "companyDocuments", maxCount: 10 },
]);

router.post("/", cpUpload, validateCompany, createCompany);
router.get("/export/excel", exportToExcel);
router.get("/", getCompanies);
router.get("/:id", getCompany);
router.patch("/:id", cpUpload, updateCompany);
router.delete("/hard/:id", deleteCompany);
router.delete("/:id", deleteCompany);

// جديد: جلب القيم الفريدة للـ filters
router.get("/filters/categories", getFilterOptions("companyCategory"));
router.get("/filters/legal-forms", getFilterOptions("legalForm"));
router.get("/filters/address", getFilterOptions("address")); // لو عايز تفلتر بالمدينة مثلاً
router.get("/filters/years", getFilterOptions("fiscalYear"));
router.get("/filters/companyName", getFilterOptions("companyName"));
router.get("/filters/companyCode", getFilterOptions("companyCode"));

export default router;