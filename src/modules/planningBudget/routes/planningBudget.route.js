import express from "express";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { createPlanningBudget } from "../controllers/planningBudget.controller.js";

const router = express.Router();

router.post("/", restrictTo("planningBudgets:create"), createPlanningBudget);

export default router;