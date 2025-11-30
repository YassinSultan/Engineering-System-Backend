import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "express-async-errors"; // Must be after express


import connectDB from "./src/config/database.js";
import errorHandler from "./src/middleware/errorHandler.js";

import companyRouter from "./src/modules/company/routes/company.routes.js";
import logger from "./src/utils/logger.js";
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

// Serve uploads
app.use("/uploads", express.static("uploads"));

// Connect DB
connectDB();

app.get("/", (req, res) => {
    res.send("API working");
});

// Routes
app.use("/api/companies", companyRouter);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});