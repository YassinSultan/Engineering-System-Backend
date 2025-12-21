import { AppError } from "../../../utils/AppError.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import ProjectModel from "../models/Project.model.js";



// create project
export const createProject = catchAsync(async (req, res, next) => {
    try {
        const currentUser = req.user;
        const body = { ...req.body };
        const files = req.files;

        console.log("data", body);
        console.log("files", files);

        const projectData = {
            name: body.name,
            contractingParty: body.contractingParty,
            status: body.status,
            code: body.code,
            startDate: new Date(body.startDate),
            location: body.location,
            landArea: Number(body.landArea),
            createdBy: currentUser._id,
        };

        /* ======================
           Coordinates
        ====================== */
        if (body["coordinates.lat"] && body["coordinates.lng"]) {
            projectData.coordinates = {
                lat: Number(body["coordinates.lat"]),
                lng: Number(body["coordinates.lng"]),
            };
        }
        /* ======================
            Files
        ====================== */
        if (files?.networkBudgetFile) {
            projectData.networkBudgetFile = files.networkBudgetFile[0].relativePath;
        }

        if (files?.siteHandoverFile) {
            projectData.siteHandoverFile = files.siteHandoverFile[0].relativePath;
        }
        /* ======================
            Budget / Military
        ====================== */
        if (body.contractingParty === "MILITARY" || body.contractingParty === "BUDGET") {
            projectData.estimatedCost = {
                value: Number(body["estimatedCost.value"]),
                file: files?.["estimatedCost.file"]?.[0]?.relativePath,
            };

            projectData.securityApprovalFile =
                files?.securityApprovalFile?.[0]?.relativePath;

            if (body.contractingParty === "BUDGET") {
                projectData.fiscalYear = body.fiscalYear;
            }
        }
        /* ======================
            Civilian
        ====================== */
        if (body.contractingParty === "CIVILIAN") {
            projectData.ownerEntity = body.ownerEntity;
        }

        const project = await ProjectModel.create(projectData);
        res.status(201).json({
            status: "success",
            data: project,
        });

    } catch (err) {
        console.log(err);
        return next(new AppError(err.errors, 400));
    }
});