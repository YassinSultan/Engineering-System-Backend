import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), "uploads")),
    filename: (req, file, cb) => {
        console.log(file.originalname);
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
        file.relativePath = `uploads/${uniqueName}`;
    },
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});