import express from "express";
import { createUnit, deleteUnit, getAllUnits, getChildrenUnits, getUnitById, getUnitsTree, updateUnit } from "../controllers/organizationalUnit.controller.js";


const router = express.Router();

router.post("/", createUnit);
router.get("/", getAllUnits);
router.get("/tree", getUnitsTree);
router.get("/:id", getUnitById);
router.get("/children/:parentId", getChildrenUnits);
router.put("/:id", updateUnit);
router.delete("/:id", deleteUnit);

export default router;
