import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";


const BillOfQuantitiesSchema = new mongoose.Schema({
    /* =======================
    Relations
    ======================= */
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
    },
    organizationalUnit: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizationalUnit"
    }],
    // ! كود الموافقة الامنية

    /* =======================
    Basic Info
    ======================= */
    // اسم المقايسة
    name: {
        type: String,
        required: true
    },
    // تخصصات المقايسة 
    disciplines: [
        {
            type: {
                type: String,
                enum: [
                    "GENERAL",
                    "PLUMBING",
                    "FIRE_FIGHTING",
                    "ELECTRICAL",
                    "HVAC",
                    "MAINTENANCE",
                    "LANDSCAPING",
                    "INFRASTRUCTURE",
                    "SWIMMING_POOLS"
                ]
            },
            amount: Number
        }
    ],
    // مدة المشروع
    projectDuration: {
        type: Number,
        min: 0,
        required: true
    },
    // المسطح
    area: {
        type: Number,
        min: 0,
        required: true
    },
    // سعر المتر المسطح
    pricePerMeter: {
        type: Number,
        min: 0,
        required: true
    },
    // سعر الحديد
    steelPrice: {
        type: Number,
        min: 0,
        required: true
    },
    // سعر الاسمنت
    cementPrice: {
        type: Number,
        min: 0,
        required: true
    },
    // نسبة التنفيذ
    completionPercentage: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
    },
    attachments: {
        boqExcel: String,
        boqPdf: String,
        priceAnalysisPdf: String,
        approvedDrawingsPdf: String,
        approvedDrawingsDwg: String,
        consultantApprovalPdf: String,
        companyProfilePdf: String
    },
    // system
    status: {
        type: String,
        enum: [
            "DRAFT",        // لسه متسجلة
            "REVIEW",       // عند الضابط
            "TECHNICAL",    // عند القائد الفني
            "GENERAL",      // عند مكتب فني اللواء
            "SENT",         // اتبعت لإدارة الأشغال
            "RETURNED"      // استيفاء
        ],
        default: "DRAFT"
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
});
BillOfQuantitiesSchema.plugin(mongoosePaginate);
export default mongoose.model("BillOfQuantities", BillOfQuantitiesSchema);