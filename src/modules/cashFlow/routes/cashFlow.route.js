import express from "express";
import { resolveUnit, restrictTo } from "../../../middleware/auth.middleware.js";
import { createCashFlow, hardDeleteCashFlow, updateCashFlow } from "../controllers/cashFlow.controller.js";
import ProtocolModel from "../../protocol/models/Protocol.model.js";
import ProjectModel from "../../project/models/Project.model.js";
import cashFlowModel from "../models/cashFlow.model.js";

const router = express.Router();

router.post("/",
    resolveUnit({
        from: { location: "body", field: "protocol" },
        chain: [
            { model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:cashFlow"),
    createCashFlow
);
router.patch(
    "/:id",
    resolveUnit({
        from: { location: "params", field: "cashFlow" },
        chain: [
            { model: cashFlowModel },
            { ref: "protocol", model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:cashFlow"),
    updateCashFlow
);
router.delete(
    "/:id",
    resolveUnit({
        from: { location: "params", field: "cashFlow" },
        chain: [
            { model: cashFlowModel },
            { ref: "protocol", model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:delete:cashFlow"),
    hardDeleteCashFlow
);

export default router;