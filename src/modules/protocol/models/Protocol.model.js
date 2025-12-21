import mongoose from "mongoose";



const protocolSchema = new mongoose.Schema(
    {
        /* =======================
            Relations
        ======================= */
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        /* =======================
            Basic Info
        ======================= */
        // اسم البروتوكول
        name: {
            type: String,
            required: true
        },
        // قيمة البروتوكول
        value: {
            type: Number,
            min: 0,
            required: true
        },
        // ملف البروتوكول   
        file: {
            type: String,
            required: true
        },
        /* =======================
            الموازنة التخطيطية & التدفقات المالية
         ======================= */
        //  الموازنة التخطيطية
        planningBudget: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PlanningBudget",
        },
        // التدفقات المالية
        cashFlows: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "CashFlow",
            },
        ],

        /* =======================
            System
    ======================= */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false
        },

    },
    { timestamps: true }
);

/* =======================
   Indexes
======================= */
protocolSchema.index({ project: 1 });
protocolSchema.index({ isDeleted: 1 });
protocolSchema.index({ project: 1, isDeleted: 1 });

export default mongoose.model("Protocol", protocolSchema);