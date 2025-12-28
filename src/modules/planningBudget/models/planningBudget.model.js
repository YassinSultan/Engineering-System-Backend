import mongoose from "mongoose";
import { AppError } from "../../../utils/AppError.js";

const planningBudgetSchema = new mongoose.Schema(
    {
        /* =======================
            Relations
            ======================= */
        protocol: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Protocol",
            required: true,
            unique: true,
            index: true,
        },
        /* =======================
            Basic Info
        ======================= */
        // نسبة الأعمال العاجلة
        urgentWorksPercentage: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        // نسبة الحوافز
        incentivesPercentage: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        // نسبة استهلاك العمالة
        laborDepreciationPercentage: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        //نسبة الفائض العام
        generalSurplusPercentage: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        total: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        /* =======================
            System
        ======================= */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedAt: {
            type: Date
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

// pre save
planningBudgetSchema.pre(["save", "findOneAndUpdate"], function (next) {
    const doc = this._update ? this._update : this;

    doc.total =
        (doc.urgentWorksPercentage || 0) +
        (doc.incentivesPercentage || 0) +
        (doc.laborDepreciationPercentage || 0) +
        (doc.generalSurplusPercentage || 0);

    if (doc.total > 100) {
        return next(new AppError("المجموع يجب ان يكون اقل من 100", 400));
    }

    next();
});

planningBudgetSchema.index({ protocol: 1, isDeleted: 1 });

export default mongoose.model("PlanningBudget", planningBudgetSchema);