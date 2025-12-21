import express from "express";
import { createOwnerEntity, getOwnerEntity } from "../controllers/ownerEntity.controller.js";

const router = express.Router();

router.post("/", createOwnerEntity);
router.get("/", getOwnerEntity);

export default router;