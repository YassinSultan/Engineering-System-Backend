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
    defaultSelect: ['name', 'code', 'location']
};
