import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const projectSchema = new mongoose.Schema(
    {
        /* =======================
        Relations
        ======================= */
        protocol: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Protocol",
            required: true,
            index: true,
        }],
        // الوحدة المنفذة
        // ! يمكن اضافة اكثر من وحدة
        organizationalUnit: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizationalUnit"
        }],

        /* 
        ----------------------
           المعلومات الاساسية
        -----------------------
        */
        // اسم المشروع
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        // جهة التعاقد
        contractingParty: {
            type: String,
            enum: ["CIVILIAN", "MILITARY", "BUDGET"],
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["STUDY", "ONGOING", "FINISHED"],
            default: "STUDY"
        },
        /* 
        ----------------------
        المعلومات الخاصة بالمشروع
        -----------------------
        */
        // كود المشروع
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        // ملف الميزانية الشبكية
        networkBudgetFile: {
            type: String,
            default: null
        },
        // ملف استلام الموقع
        siteHandoverFile: {
            type: String,
            default: null
        },
        // تاريخ بدء المشروع
        startDate: {
            type: Date,
            required: true
        },
        // مكان المشروع
        location: {
            type: String,
            required: true
        },
        // خط العرض / خط الطول   (احداثي الارض)
        coordinates: {
            lat: Number,
            lng: Number,
        },
        // مساحة الارض
        landArea: {
            type: Number,
            required: true
        },
        /* 
            ----------------------
            خاص بجهة الموازنة
            -----------------------
        */
        //    العام المالي
        fiscalYear: {
            type: String,
            required: function () {
                return this.contractingParty === "BUDGET";
            }
        },
        /* 
    ----------------------
    خاص بجهة الموازنة , القوات المسلحة
    -----------------------
        */
        //    التكلفة التقديرية
        estimatedCost: {
            value: {
                type: Number,
                required: function () {
                    return ["MILITARY", "BUDGET"].includes(this.contractingParty);
                }
            },
            file: {
                type: String,
                required: function () {
                    return ["MILITARY", "BUDGET"].includes(this.contractingParty);
                }
            }
        },
        // ملف تصديق الامانة
        securityApprovalFile: {
            type: String,
            required: function () {
                return this.contractingParty === "MILITARY" || this.contractingParty === "BUDGET";
            }
        },

        /* 
            ----------------------
            خاص بجهة المدنية فقط 
            -----------------------
                */

        // الجهة المالكة
        ownerEntity: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OwningEntity",
            required: function () {
                return this.contractingParty === "CIVILIAN";
            }
        },
        /* 
        ----------------------
       معلومات خاصه بالنظام 
        -----------------------
        */
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

projectSchema.plugin(mongoosePaginate);
/* =======================
   Indexes
======================= */
projectSchema.index({ contractingParty: 1 });
projectSchema.index({ isDeleted: 1 });
projectSchema.index({ contractingParty: 1, isDeleted: 1 });


export default mongoose.model("Project", projectSchema);