import express from "express";
import { resolveUnit, restrictTo } from "../../../middleware/auth.middleware.js";
import { createProtocol, getProtocols, updateImplementationRate, updateProtocol } from "../controllers/protocol.controller.js";
import { upload } from "../../../middleware/upload.js";
import ProjectModel from "../../project/models/Project.model.js";
import ProtocolModel from "../models/Protocol.model.js";


const cpUpload = upload.fields([
    { name: "file", maxCount: 1 },
]);
const router = express.Router();
// اضافة بروتوكول
router.post(
    "/",
    cpUpload,
    resolveUnit({
        from: { location: "body", field: "project" },
        chain: [
            { model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:create:protocol"),
    createProtocol);
// عرض كل البروتوكولات
router.get("/", restrictTo("projects:read:protocol"), getProtocols);
// تحديث بروتوكول
router.patch(
    "/:id",
    cpUpload,
    resolveUnit({
        from: { location: "params", field: "id" }, // id of protocol
        chain: [
            { model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:protocol"),
    updateProtocol
);
router.patch(
    "/:id/implementation-rate",
    resolveUnit({
        from: { location: "params", field: "id" },
        chain: [
            { model: ProtocolModel },
            { ref: "project", model: ProjectModel },
            { ref: "organizationalUnit", isUnit: true }
        ]
    }),
    restrictTo("projects:update:implementationRate"),
    updateImplementationRate
);

export default router;