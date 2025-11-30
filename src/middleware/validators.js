import { z } from "zod";
import { AppError } from "../utils/AppError.js";

const companySchema = z.object({
    companyCode: z.string().min(1),
    commercialRegister: z.string().min(1),
    securityApprovalNumber: z.string().min(1),
    securityApprovalDate: z.preprocess(
        (val) => val instanceof Date ? val : new Date(val),
        z.date()
    ),
    fiscalYear: z.string().min(1),
    companyName: z.string().min(1),
    companyCategory: z.string().min(1),
    companyBrand: z.string().optional(),
    companyActivity: z.string().min(1),
    ownerName: z.string().min(1),
    ownerNID: z.string().min(1),
    representativeName: z.string().optional(),
    address: z.string().min(1),
    phones: z.array(z.string()).min(1),
    fax: z.string().optional(),
    email: z.string().email(),
    legalForm: z.string().min(1),
    securityFileNumber: z.string().optional(),
});

export const validateCompany = (req, res, next) => {
    try {
        companySchema.parse(req.body);
        next();
    } catch (err) {
        next(new AppError(err.errors.map(e => e.message).join(", "), 400));
    }
};