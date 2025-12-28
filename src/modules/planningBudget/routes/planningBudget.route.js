import express from "express";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { createPlanningBudget, updatePlanningBudget } from "../controllers/planningBudget.controller.js";

const router = express.Router();

router.post("/", restrictTo("planningBudgets:create"), createPlanningBudget);
router.patch("/:protocolId", restrictTo("planningBudgets:update"), updatePlanningBudget);

export default router;