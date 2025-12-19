import userModel from "../modules/User/models/user.model.js";
import logger from "../utils/logger.js";

export const seedSuperAdmin = async () => {
    try {
        const existingAdmin = await userModel
            .findOne({ role: "SUPER_ADMIN" })
            .select("+password"); // لو عايز تتأكد من شيء إضافي

        if (existingAdmin) {
            logger.info("Super Admin already exists. Skipping seeding.");
            return;
        }

        // جلب البيانات من environment variables (أفضل ممارسة)
        const superAdminData = {
            fullNameArabic: process.env.SUPER_ADMIN_ARABIC_NAME || "سوبر أدمن",
            fullNameEnglish: process.env.SUPER_ADMIN_ENGLISH_NAME || "Super Admin",
            phones: (process.env.SUPER_ADMIN_PHONES || "01234567890").split(",").map(p => p.trim()),
            username: (process.env.SUPER_ADMIN_USERNAME || "superadmin").toLowerCase(),
            password: process.env.SUPER_ADMIN_PASSWORD || "12345678", // كلمة سر قوية افتراضية
            role: "SUPER_ADMIN",
        };

        // تحقق بسيط من قوة كلمة السر (اختياري)
        if (superAdminData.password.length < 8) {
            throw new Error("Super Admin password must be at least 8 characters long.");
        }

        const superAdmin = new userModel(superAdminData);

        await superAdmin.save();

        logger.info(`Super Admin created successfully with username: ${superAdmin.username}`);
        logger.warn("RECOMMENDATION: Change the Super Admin password immediately after first login!");

    } catch (error) {
        logger.error("Error seeding Super Admin:", error.message || error);
        throw error; // عشان الـ caller يعرف إن فيه مشكلة
    }
};