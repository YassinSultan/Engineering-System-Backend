import fs from "fs/promises";
import logger from "./logger.js";

export const deleteFiles = async (filePaths) => {
    for (const filePath of filePaths) {
        try {
            await fs.unlink(filePath);
            logger.info(`Deleted file: ${filePath}`);
        } catch (err) {
            logger.error(`Error deleting file ${filePath}: ${err.message}`);
        }
    }
};