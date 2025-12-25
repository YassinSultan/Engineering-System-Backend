import express from "express";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { createCashFlow } from "../controllers/cashFlow.controller.js";

const router = express.Router();

router.post("/", restrictTo("cashFlows:create"), createCashFlow);

export default router;