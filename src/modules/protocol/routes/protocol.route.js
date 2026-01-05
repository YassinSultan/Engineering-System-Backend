import express from "express";
import { restrictTo } from "../../../middleware/auth.middleware.js";
import { createProtocol, getProtocols, updateImplementationRate, updateProtocol } from "../controllers/protocol.controller.js";
import { upload } from "../../../middleware/upload.js";


const cpUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
const router = express.Router();

router.post("/", cpUpload, restrictTo("protocols:create"), createProtocol);
router.get("/", restrictTo("protocols:read"), getProtocols);
router.patch("/:id", cpUpload, restrictTo("protocols:update"), updateProtocol);
router.patch("/:id/implementation-rate", restrictTo("protocols:update:implementationRate"), updateImplementationRate);



export default router;