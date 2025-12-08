
import userModel from "../modules/User/models/user.model.js";
import logger from "../utils/logger.js"; // لو عندك logger، غير كده استخدم console.log

export const seedSuperAdmin = async () => {
    try {
        // شوف لو Super Admin موجود
        const existingAdmin = await userModel.findOne({ role: "super_admin" });

        if (existingAdmin) {
            logger.info("Super Admin already exists. Skipping seeding.");
            return;
        }

        // أنشئ Super Admin جديد
        const superAdmin = new userModel({
            fullName: "Super Admin",
            mainUnit: "Admin Unit",
            username: "superadmin",
            password: "123456",
            role: "super_admin",
        });

        await superAdmin.save();
        logger.info("Super Admin seeded successfully!");
    } catch (error) {
        logger.error("Error seeding Super Admin:", error);
    }
};