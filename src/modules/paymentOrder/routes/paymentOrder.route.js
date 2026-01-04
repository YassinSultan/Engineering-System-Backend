import express from "express";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { createPaymentOrder, hardDeletePaymentOrder, updatePaymentOrder } from "../controllers/paymentOrder.contoller.js";
import { upload } from "../../../middleware/upload.js";

const router = express.Router();
const cpUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
router.post("/", cpUpload, restrictTo("paymentOrders:create"), createPaymentOrder);
router.patch("/:id", cpUpload, restrictTo("paymentOrders:update"), updatePaymentOrder);
router.delete("/", cpUpload, restrictTo("paymentOrders:delete"), hardDeletePaymentOrder);

export default router;