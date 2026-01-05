
import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { deleteFiles } from "../../../utils/deleteFiles.js";
import logger from "../../../utils/logger.js";
import ProjectModel from "../../project/models/Project.model.js";
import ProtocolModel from "../models/Protocol.model.js";


export const createProtocol = catchAsync(async (req, res, next) => {
    const curentUser = req.user;
    const projectId = req.body.project;
    const project = await ProjectModel.findById(projectId);
    if (!project || project.isDeleted) return next(new AppError("project not found", 404));

    if (project.contractingParty !== "CIVILIAN") {
        return next(new AppError("لا يمكن اضافة بروتوكل الا لمشروع جهة مدنية", 404));
    }
    const data = { ...req.body };

    if (req.files?.file?.[0]) {
        console.log(req.files.file[0]);
        const file = req.files.file[0];
        data.file = file.relativePath;
    }
    const protocol = await ProtocolModel.create({
        ...data,
        createdBy: curentUser._id
    });
    res.json({ success: true, data: protocol });
});

export const getProtocols = catchAsync(async (req, res, next) => {
    const protocols = await ProtocolModel.find()
        .populate("planningBudget")
        .populate("cashFlows")
        .populate("paymentOrders");
    res.json({ success: true, data: protocols });
});

export const getSpecificProtocol = catchAsync(async (req, res, next) => {
    const protocol = await ProtocolModel.findById(req.params.id)
        .populate("planningBudget")
        .populate("cashFlows")
        .populate("paymentOrders");
    res.json({ success: true, data: protocol });
});

export const deleteProtocol = catchAsync(async (req, res, next) => {
    const protocol = await ProtocolModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: protocol });
});

export const updateProtocol = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const oldProtocol = await ProtocolModel.findById(id);
    if (!oldProtocol || oldProtocol.isDeleted) {
        return next(new AppError("Protocol not found", 404));
    }

    const updates = { ...req.body };
    if (req.files?.file) {
        updates.file = req.files.file[0].relativePath;
        if (oldProtocol.file) {
            deleteFiles([oldProtocol.file]);
        }
    }
    // === التحديث الجزئي الآمن (بس الحقول اللي جاية) ===
    const updated = await ProtocolModel.findByIdAndUpdate(
        id,
        { $set: updates },  // ← الأهم: $set مش تمرير الـ object مباشرة
        { new: true, runValidators: true }
    );

    logger.info(`Protocol partially updated: ${id}`);
    res.json({ success: true, data: updated });
});

export const updateImplementationRate = catchAsync(async (req, res, next) => {
    const currentUser = req.user;
    const { id } = req.params;
    const { currentPercentage, currentDate } = req.body;

    // 1️⃣ Validation
    if (
        currentPercentage === undefined ||
        typeof currentPercentage !== "number" ||
        currentPercentage < 0 ||
        currentPercentage > 100
    ) {
        return next(new AppError("نسبة التنفيذ غير صالحة", 400));
    }

    if (!currentDate || isNaN(new Date(currentDate))) {
        return next(new AppError("تاريخ التنفيذ غير صالح", 400));
    }

    const protocol = await ProtocolModel.findById(id);
    if (!protocol || protocol.isDeleted) {
        return next(new AppError("لا يوجد بروتوكول أو البروتوكول محذوف", 404));
    }

    // 2️⃣ منع التكرار
    if (
        protocol.currentPercentage === currentPercentage &&
        protocol.currentDate?.toISOString() === new Date(currentDate).toISOString()
    ) {
        return next(new AppError("لا يوجد تغيير في نسبة التنفيذ", 400));
    }

    // 3️⃣ إضافة سجل تاريخي
    protocol.executionHistory.push({
        percentage: currentPercentage,
        date: currentDate,
        updatedBy: currentUser._id,
    });

    // 4️⃣ تحديث القيم الحالية
    protocol.currentPercentage = currentPercentage;
    protocol.currentDate = currentDate;

    await protocol.save();

    res.status(200).json({
        success: true,
        data: {
            _id: protocol._id,
            currentPercentage: protocol.currentPercentage,
            currentDate: protocol.currentDate,
            executionHistoryCount: protocol.executionHistory.length,
        },
    });
});