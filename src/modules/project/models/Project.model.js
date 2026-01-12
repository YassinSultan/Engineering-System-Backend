import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const coordinateSchema = new mongoose.Schema({
    e: { type: Number, required: true },
    n: { type: Number, required: true },
}, { _id: false });

const contractPermissionSchema = new mongoose.Schema({
    value: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    file: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});
const financialAllocationSchema = new mongoose.Schema({
    value: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    file: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});
const estimatedCostSchema = new mongoose.Schema({
    value: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    file: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

const withdrawalPermissionSchema = new mongoose.Schema({
    value: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    file: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

const projectSchema = new mongoose.Schema(
    {
        /* =======================
        Relations
        ======================= */
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
            type: [coordinateSchema],
            required: true,
            validate: [arr => arr.length >= 3, 'Polygon يجب أن يحتوي على 3 نقاط على الأقل']
        },
        // مساحة الارض
        landArea: {
            type: Number,
            required: true
        },
        // سماحات التعاقد
        contractPermissions: [contractPermissionSchema],
        // سماحات الصرف
        withdrawalPermissions: [withdrawalPermissionSchema],

        financialAllocations: [financialAllocationSchema],
        estimatedCosts: [estimatedCostSchema],
        // ملف العرض
        presentationFile: {
            type: String
        },
        // ملف التصوير الجوي
        aerialPhotographyFile: {
            type: String
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
            ref: "OwnerEntity",
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
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);
projectSchema.virtual("protocols", {
    ref: "Protocol",
    localField: "_id",
    foreignField: "project",
});


projectSchema.plugin(mongoosePaginate);
/* =======================
   Indexes
======================= */
projectSchema.index({ name: "text", code: "text", location: "text" });
projectSchema.index({ contractingParty: 1 });
projectSchema.index({ isDeleted: 1 });
projectSchema.index({ contractingParty: 1, isDeleted: 1 });


export default mongoose.model("Project", projectSchema);