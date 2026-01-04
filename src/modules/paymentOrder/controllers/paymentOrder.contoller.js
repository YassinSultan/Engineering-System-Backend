import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import ProtocolModel from "../../protocol/models/Protocol.model.js";
import paymentOrderModel from "../models/paymentOrder.model.js";

export const createPaymentOrder = catchAsync(async (req, res, next) => {
    try {
        const curentUser = req.user;
        const protocolId = req.body.protocol;
        const protocol = await ProtocolModel.findById(protocolId);
        if (!protocol || protocol.isDeleted) return next(new AppError("لا يوجد بروتوكل", 404));

        const data = { ...req.body };
        console.log(req.body);
        console.log(req.files);
        if (req.files?.file?.[0]) {
            const file = req.files.file[0];
            data.file = file.relativePath;
        }

        const paymentOrder = await paymentOrderModel.create({
            ...data,
            createdBy: curentUser._id
        });
        res.json({ success: true, data: paymentOrder });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});

export const updatePaymentOrder = catchAsync(async (req, res, next) => {
    try {
        console.log(req.body);
        const { id } = req.params;
        const updates = { ...req.body };
        if (req.files?.file?.[0]) {
            const file = req.files.file[0];
            updates.file = file.relativePath;
        }
        const updated = await paymentOrderModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        res.json({ success: true, data: updated });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});

export const hardDeletePaymentOrder = catchAsync(async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await paymentOrderModel.findByIdAndDelete(id);
        res.json({ success: true, data: deleted });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
});