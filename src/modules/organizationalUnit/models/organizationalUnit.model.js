import mongoose from "mongoose";

const organizationalUnitSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: [
            "ADMINISTRATION", // ادارة
            "BRANCH", // فرع
            "OFFICE", // مكتب
            "MAIN_UNIT", // وحدة رئيسية
            "SUB_UNIT" // وحدة فرعية
        ],
        required: true
    },

    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrganizationalUnit",
        default: null
    }
}, { timestamps: true });


export default mongoose.model("OrganizationalUnit", organizationalUnitSchema);