import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import ProtocolModel from "../../protocol/models/Protocol.model.js";
import cashFlowModel from "../models/cashFlow.model.js";


export const createCashFlow = catchAsync(async (req, res, next) => {
    try {
        const curentUser = req.user;
        const protocolId = req.body.protocol;
        const protocol = await ProtocolModel.findById(protocolId);
        if (!protocol || protocol.isDeleted) return next(new AppError("لا يوجد بروتوكل", 404));

        const data = { ...req.body };

        const planningBudget = await cashFlowModel.create({
            ...data,
            createdBy: curentUser._id
        });
        res.json({ success: true, data: planningBudget });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});


export const updateCashFlow = catchAsync(async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        const updated = await cashFlowModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        res.json({ success: true, data: updated });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});

export const hardDeleteCashFlow = catchAsync(async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await cashFlowModel.findByIdAndDelete(id);
        res.json({ success: true, data: deleted });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});