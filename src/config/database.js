import mongoose from "mongoose";

export default async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("DB Connected");
    } catch (err) {
        console.error("DB Error:", err);
        process.exit(1); // Exit if DB fails
    }
}