
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
        .populate("cashFlows");
    res.json({ success: true, data: protocols });
});

export const getSpecificProtocol = catchAsync(async (req, res, next) => {
    const protocol = await ProtocolModel.findById(req.params.id)
        .populate("planningBudget")
        .populate("cashFlows");
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