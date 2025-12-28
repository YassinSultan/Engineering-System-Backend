import express from "express";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { createCashFlow, hardDeleteCashFlow, updateCashFlow } from "../controllers/cashFlow.controller.js";

const router = express.Router();

router.post("/", restrictTo("cashFlows:create"), createCashFlow);
router.patch("/:id", restrictTo("cashFlows:update"), updateCashFlow);
router.delete("/:id", restrictTo("cashFlows:delete"), hardDeleteCashFlow);

export default router;