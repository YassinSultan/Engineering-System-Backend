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
export const updatePlanningBudget = catchAsync(async (req, res, next) => {
    const currentUser = req.user;
    const protocolId = req.params.protocolId;

    // 1. Validate protocol exists
    const protocol = await ProtocolModel.findById(protocolId);
    if (!protocol || protocol.isDeleted) {
        return next(new AppError("البروتوكول غير موجود", 404));
    }

    // 2. Find existing planning budget for this protocol
    let planningBudget = await planningBudgetModel.findOne({ protocol: protocolId });

    const data = {
        ...req.body,
        protocol: protocolId,           // make sure it's always set
        updatedBy: currentUser._id,
        updatedAt: new Date(),
    };

    if (planningBudget) {
        // 3a. UPDATE existing
        planningBudget = await planningBudgetModel.findByIdAndUpdate(
            planningBudget._id,
            { $set: data },
            { new: true, runValidators: true }
        );
    } else {
        // 3b. CREATE new (only if doesn't exist)
        data.createdBy = currentUser._id;
        planningBudget = await planningBudgetModel.create(data);
    }

    res.status(200).json({
        success: true,
        data: planningBudget
    });
});