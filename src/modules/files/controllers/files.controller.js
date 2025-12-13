import path from "path";
import fs from "fs";

export const downloadFile = (req, res) => {
    const { filename } = req.params;

    const filePath = path.join(
        process.cwd(),
        "uploads",
        filename
    );

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }

    res.download(filePath, filename);
};
