import express from "express";
import { resolveUnit, restrictTo } from "../../../middleware/auth.middleware.js";
import { createPaymentOrder, hardDeletePaymentOrder, updatePaymentOrder } from "../controllers/paymentOrder.contoller.js";
import { upload } from "../../../middleware/upload.js";
import paymentOrderModel from "../models/paymentOrder.model.js";
import ProjectModel from "../../project/models/Project.model.js";
import ProtocolModel from "../../protocol/models/Protocol.model.js";

const router = express.Router();
const cpUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
router.post(
    "/",
    cpUpload,
    resolveUnit({
        from: { location: "body", field: "protocol" },
        chain: [
            { model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:paymentOrder"),
    createPaymentOrder
);
router.patch(
    "/:id",
    cpUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: paymentOrderModel },
            { ref: "protocol", model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("paymentOrders:update"),
    updatePaymentOrder
);
router.delete(
    "/:id",
    cpUpload,
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: paymentOrderModel },
            { ref: "protocol", model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("paymentOrders:delete"),
    hardDeletePaymentOrder);

export default router;