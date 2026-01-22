import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import billOfQuantitieModel from "../models/billOfQuantitie.model.js";

export const resolveBoqStepPermission = catchAsync(async (req, res, next) => {
    const boq = await billOfQuantitieModel.findById(req.params.id);
    if (!boq) {
        return next(new AppError("BOQ not found", 404));
    }

    const permissionByStatus = {
        REVIEW: "billOfQuantitie:step:REVIEW",
        TECHNICAL: "billOfQuantitie:step:TECHNICAL",
        GENERAL: "billOfQuantitie:step:GENERAL"
    };

    const requiredPermission = permissionByStatus[boq.status];
    if (!requiredPermission) {
        return next(new AppError("Invalid BOQ status", 400));
    }
    req.requiredPermission = requiredPermission;
    req.boq = boq;
    next();
});