import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import ProtocolModel from "../../protocol/models/Protocol.model.js";
import planningBudgetModel from "../models/planningBudget.model.js";


export const createPlanningBudget = catchAsync(async (req, res, next) => {
    try {
        const curentUser = req.user;
        const protocolId = req.body.protocol;
        const protocol = await ProtocolModel.findById(protocolId);
        if (!protocol || protocol.isDeleted) return next(new AppError("protocol not found", 404));

        const data = { ...req.body };

        const planningBudget = await planningBudgetModel.create({
            ...data,
            createdBy: curentUser._id
        });
        res.json({ success: true, data: planningBudget });
    } catch (error) {
        //E11000
        if (error.code === 11000) {
            return next(new AppError("لا يمكن ان يكون لنفس البروتوكل اكثر من موازنة تخطيطية", 409));
        }
        return next(new AppError(error.message, 500));
    }
});