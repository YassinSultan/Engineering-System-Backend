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
import filesRouter from "./src/modules/files/routes/files.routes.js";
import organizationalUnitRouter from "./src/modules/organizationalUnit/routes/organizationalUnit.route.js";
import projectRouter from "./src/modules/project/routes/project.route.js";
import ownerEntityRouter from "./src/modules/ownerEntity/routes/ownerEntity.route.js";
import protocolRouter from "./src/modules/protocol/routes/protocol.route.js";
import planningBudgetRouter from "./src/modules/planningBudget/routes/planningBudget.route.js";
import cashFlowRouter from "./src/modules/cashFlow/routes/cashFlow.route.js";
import suggestionRouter from "./src/modules/suggestions/routes.js";
import paymentOrderRouter from "./src/modules/paymentOrder/routes/paymentOrder.route.js";
import logger from "./src/utils/logger.js";
import { protect } from "./src/middleware/auth.middleware.js";
import { seedSuperAdmin } from "./src/config/seed.js";
dotenv.config();
const app = express();

app.use(helmet());
app.use(cors({
    origin: "http://localhost:5173"
}));
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
app.use("/api/files", filesRouter);
app.use("/api/companies", protect, companyRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", protect, userRouter);
app.use("/api/profile", protect, profileRouter);
app.use("/api/units", protect, organizationalUnitRouter);
app.use("/api/projects", protect, projectRouter);
app.use("/api/owner-entity", protect, ownerEntityRouter);
app.use("/api/protocols", protect, protocolRouter);
app.use("/api/planning-budget", protect, planningBudgetRouter);
app.use("/api/cash-flow", protect, cashFlowRouter);
app.use('/api/suggestions', protect, suggestionRouter);
app.use('/api/payment-order', protect, paymentOrderRouter);
app.use("*", (req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});