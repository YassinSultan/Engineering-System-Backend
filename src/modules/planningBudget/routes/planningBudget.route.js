import express from "express";
import { resolveUnit, restrictTo } from "../../../middleware/auth.middleware.js";
import { createPlanningBudget, updatePlanningBudget } from "../controllers/planningBudget.controller.js";
import ProtocolModel from "../../protocol/models/Protocol.model.js";
import ProjectModel from "../../project/models/Project.model.js";

const router = express.Router();

router.post(
    "/",
    resolveUnit({
        from: { location: "body", field: "protocol" },
        chain: [
            { model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:planningBudget"),
    createPlanningBudget
);
router.patch(
    "/:protocolId",
    resolveUnit({
        from: { location: "params", field: "protocolId" },
        chain: [
            { model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:planningBudget"),
    updatePlanningBudget
);

export default router;