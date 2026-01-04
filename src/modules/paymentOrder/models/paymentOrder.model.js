import mongoose from "mongoose";


const paymentOrderSchema = new mongoose.Schema({
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
    // رقم
    number: {
        type: String,
        required: true,
    },
    // قيمة
    value: {
        type: Number,
        required: true,
    },
    // تاريخ
    date: {
        type: Date,
        required: true,
    },
    // ملف
    file: {
        type: String,
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

export default mongoose.model("PaymentOrder", paymentOrderSchema);