import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const companySchema = new mongoose.Schema(
    {
        companyCode: String, //كود الشركة
        commercialRegister: String, //رقم السجل
        securityApprovalNumber: String, //رقم الموافقة الأمنية
        securityApprovalDate: Date, //تاريخ الموافقة الأمنية
        fiscalYear: String, //العام المالي
        companyName: String, //اسم الشركة
        companyCategory: String, //فئة الشركة
        companyBrand: String, //السمة التجارية للشركة
        companyActivity: String, //  نشاط الشركة
        ownerName: String, //مالك الشركة
        ownerNID: String, // الرقم القومي لمالك الشركة 
        representativeName: String, //اسم المندوب
        address: String, // عنوان الشركة
        phones: [String], //تليفونات الشركة
        fax: String, // الفاكس
        email: String, // البريد الالكتروني
        legalForm: String, // الشكل القانوني
        securityFileNumber: String, //رقم الملف بمكتب الامن

        // Files
        securityApprovalFile: String, // الموافقة الأمنية
        companyDocuments: [String], //اوراق الشركة

        branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
        // Soft delete
        deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

companySchema.plugin(mongoosePaginate);

// Full-Text Search Index (أهم خطوة)
companySchema.index({
    companyCode: "text",
    companyName: "text",
    commercialRegister: "text",
    securityApprovalNumber: "text",
    securityFileNumber: "text",
    companyCategory: "text",
    companyBrand: "text",
    companyActivity: "text",
    ownerName: "text",
    ownerNID: "text",
    representativeName: "text",
    address: "text",
    email: "text",
    legalForm: "text",
    fax: "text"
});
export default mongoose.model("Company", companySchema);