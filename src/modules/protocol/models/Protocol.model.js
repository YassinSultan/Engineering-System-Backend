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
        currentPercentage: Number,
        currentDate: Date,
        /* =======================
            System
    ======================= */
        executionHistory: [
            {
                percentage: {
                    type: Number,
                    required: true,
                },
                date: {
                    type: Date,
                    required: true,
                },
                updatedAt: {
                    type: Date,
                    default: Date.now,
                },
                updatedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                }
            }
        ],
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
protocolSchema.virtual("planningBudget", {
    ref: "PlanningBudget",
    localField: "_id",
    foreignField: "protocol",
    justOne: true, // مهم جدًا
});
protocolSchema.virtual("cashFlows", {
    ref: "CashFlow",
    localField: "_id",
    foreignField: "protocol",
});
protocolSchema.virtual("paymentOrders", {
    ref: "PaymentOrder",
    localField: "_id",
    foreignField: "protocol",
});

protocolSchema.pre("save", async function (next) {
    const Project = mongoose.model("Project");
    const project = await Project.findById(this.project);

    if (!project) {
        return next(new Error("لا يوجد مشروع"));
    }

    if (project.contractingParty !== "CIVILIAN") {
        return next(new Error("لا يمكن اضافة بروتوكل الا لمشروع جهة مدنية"));
    }

    next();
});
/* =======================
   Indexes
======================= */
protocolSchema.index({ project: 1 });
protocolSchema.index({ isDeleted: 1 });
protocolSchema.index({ project: 1, isDeleted: 1 });

export default mongoose.model("Protocol", protocolSchema);