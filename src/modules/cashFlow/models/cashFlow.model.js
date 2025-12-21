import mongoose from "mongoose";


const cashFlowSchema = new mongoose.Schema({
    /* =======================
    Relations
    ======================= */
    protocol: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Protocol",
        required: true,
        index: true,
    },

    /* =======================
    Basic Info
    ======================= */
    // ملاحظات
    notes: {
        type: String
    },
    // نسبة تنفيذ
    completionPercentage: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
    },
    // نسبة صرف
    withdrawalPercentage: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
    },

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

}, { timestamps: true });

export default mongoose.model("CashFlow", cashFlowSchema);