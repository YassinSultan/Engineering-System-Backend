import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "express-async-errors"; // Must be after express


import connectDB from "./src/config/database.js";
import errorHandler from "./src/middleware/errorHandler.js";


import authRouter from "./src/modules/User/routes/auth.routes.js";
import companyRouter from "./src/modules/company/routes/company.routes.js";
import userRouter from "./src/modules/User/routes/user.routes.js";
import profileRouter from "./src/modules/User/routes/profile.routes.js";
import logger from "./src/utils/logger.js";
import { branchFilter, protect } from "./src/middleware/auth.middleware.js";
import { seedSuperAdmin } from "./src/config/seed.js";
dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
});
app.use(limiter);


// Connect DB
connectDB();
seedSuperAdmin();


app.get("/", (req, res) => {
    res.send("API working");
});

// Serve uploads
app.use("/uploads", express.static("uploads"));
app.use('/avatars', express.static('public/avatars'));

// Routes
app.use("/api/companies", protect, branchFilter, companyRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/profile", profileRouter);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});