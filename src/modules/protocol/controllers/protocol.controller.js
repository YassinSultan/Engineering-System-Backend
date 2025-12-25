import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
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
    console.log(data);
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