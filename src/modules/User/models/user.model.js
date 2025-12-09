import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import mongoosePaginate from "mongoose-paginate-v2";
const userSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        mainUnit: { type: String, required: true },
        subUnit: { type: String, trim: true },
        specialization: { type: String, trim: true },
        office: { type: String, trim: true },
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
            select: false, // لا يتم جلب الباسورد تلقائياً
            minlength: 6,
        },

        role: {
            type: String,
            enum: ["super_admin", "admin", "engineer", "user"],
            default: "user",
        },

        avatar: {
            type: String,
            default: "/avatars/user.png", // fallback
        },

        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: function () {
                return this.role !== "super_admin"; // Fixed logic
            },
        },

        permissions: {
            type: [String],
            default: [],
            required: function () {
                return this.role !== "super_admin"; // Fixed logic
            },
        },

        // Soft delete
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

userSchema.plugin(mongoosePaginate);

// Full-Text Search Index (أهم خطوة)
userSchema.index({
    fullName: "text",
    mainUnit: "text",
    subUnit: "text",
    specialization: "text",
    office: "text",
    phones: "text",
    username: "text",
    role: "text",
    branchId: "text",
    permissions: "text"

});
// Virtual to check if user is super admin
userSchema.virtual("isSuperAdmin").get(function () {
    return this.role === "super_admin";
});

// Auto-set avatar based on role (runs on save)
userSchema.pre("save", function (next) {
    const avatars = {
        super_admin: "/avatars/super_admin.png",
        admin: "/avatars/admin.png",
        engineer: "/avatars/engineer.png",
        user: "/avatars/user.png",
    };

    this.avatar = avatars[this.role] || avatars.user;

    // Clean fields for super_admin
    if (this.role === "super_admin") {
        this.branchId = undefined;
        this.permissions = [];
    }

    next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        this.password = await bcrypt.hash(this.password, 12);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Optional: Hide sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.__v;
    return user;
};

export default mongoose.model("User", userSchema);