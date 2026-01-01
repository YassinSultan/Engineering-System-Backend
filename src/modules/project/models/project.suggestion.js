import ProjectModel from './Project.model.js';

export default {
    key: 'projects',
    model: ProjectModel,

    allowedColumns: {
        name: 'string',
        code: 'string',
        location: 'string',
        landArea: 'number'
    },
    globalFields: ['name', 'code', 'location'],
    defaultSelect: ['name', 'code', 'location'],
    fieldLabels: {
        name: 'الاسم',
        code: 'الكود',
        location: 'الموقع'
    },
    filters: {
        startDate: { type: "date", modes: ["single", "range"] },
        landArea: { type: "number", modes: ["single", "range"] },
        contractingParty: { type: "enum" },
        location: { type: "text" },
        code: { type: "text" },
        status: { type: "enum" },
        name: { type: "text" },
    }

};
