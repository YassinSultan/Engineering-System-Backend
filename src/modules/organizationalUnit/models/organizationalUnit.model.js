import mongoose from "mongoose";

const organizationalUnitSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: [
            "MAIN_UNIT", // وحدة رئيسية
            "SUB_UNIT", // وحدة فرعية
            "DEPARTMENT", // قسم
        ],
        required: true
    },

    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizationalUnit",
        default: null
    },
    path: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizationalUnit",
        default: null
    }],
}, { timestamps: true });

// Index لتسريع البحث عن الأبناء
organizationalUnitSchema.index({ parent: 1 });

// Index فريد للاسم تحت نفس الـ parent (اختياري حسب الحاجة)
organizationalUnitSchema.index({ parent: 1, name: 1 }, { unique: true });

// Index لتسريع الاستعلامات على الـ path (للبحث عن الأحفاد)
organizationalUnitSchema.index({ path: 1 });

export default mongoose.model("OrganizationalUnit", organizationalUnitSchema);