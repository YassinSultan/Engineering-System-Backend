// src/models/branch.model.js
import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    address: { type: String },
    code: { type: String, unique: true },
}, { timestamps: true });

export default mongoose.model("Branch", branchSchema);