import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import mongoosePaginate from "mongoose-paginate-v2";

const userSchema = new mongoose.Schema(
    {
        fullNameArabic: { type: String, required: true, trim: true },
        fullNameEnglish: { type: String, required: true, trim: true },
        specialization: {
            type: String,
            enum: ["CIVILIAN", "MILITARY"],
            required: function () {
                return this.role !== "SUPER_ADMIN";
            },
            trim: true
        },
        phones: [String],

        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            minlength: 3,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false, // أمان إضافي: الـ password مش هيظهر أبدًا إلا بطلب صريح
        },

        role: {
            type: String,
            enum: ["SUPER_ADMIN", "USER"],
            default: "USER",
        },

        avatar: {
            type: String,
            default: "/avatars/user.png",
        },

        organizationalUnit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizationalUnit",
            required: function () {
                return this.role !== "SUPER_ADMIN";
            },
        },

        permissions: [{
            action: {
                type: String,
                required: true,
                trim: true,
                // مثال: "companies:create", "employees:read:own", إلخ
            },
            scope: {
                type: String,
                enum: ["OWN_UNIT", "CUSTOM_UNITS", "ALL"],
                required: true
            },
            units: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "OrganizationalUnit"
            }]
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () {
                return this.role !== "SUPER_ADMIN";
            },
        },
        isDeleted: { type: Boolean, default: false },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

// ==================== Validation ====================
userSchema.path("permissions").validate(function (permissions) {
    return permissions.every(perm => {
        if (perm.scope === "CUSTOM_UNITS") {
            return perm.units && perm.units.length > 0;
        }
        return !perm.units || perm.units.length === 0;
    });
}, "Invalid units array for the given permission scope");

// ==================== Plugins ====================
userSchema.plugin(mongoosePaginate);

// ==================== Virtuals ====================
userSchema.virtual("isSuperAdmin").get(function () {
    return this.role === "SUPER_ADMIN";
});

// ==================== Pre-save Hooks ====================
userSchema.pre("save", function (next) {
    // Auto-set avatar بناءً على الدور
    const avatars = {
        SUPER_ADMIN: "/avatars/super_admin.png",
        USER: "/avatars/user.png",
    };
    this.avatar = avatars[this.role] || "/avatars/user.png";

    // تنظيف الحقول غير الضرورية للـ SUPER_ADMIN
    if (this.role === "SUPER_ADMIN") {
        this.organizationalUnit = undefined;
        this.permissions = [];
    }

    next();
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        this.password = await bcrypt.hash(this.password, 12);
        next();
    } catch (err) {
        next(err);
    }
});

// ==================== Methods ====================
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.__v;
    return user;
};

// ==================== Indexes ====================
// لتحسين الأداء في الاستعلامات الشائعة
userSchema.index({ role: 1 });
userSchema.index({ organizationalUnit: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ role: 1, isDeleted: 1 }); // مركب مفيد جدًا

export default mongoose.model("User", userSchema);