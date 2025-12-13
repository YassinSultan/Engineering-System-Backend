import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), "uploads")),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max; increase if needed, e.g., 50 * 1024 * 1024 for 50MB
});