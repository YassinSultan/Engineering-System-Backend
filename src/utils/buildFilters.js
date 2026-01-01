export const buildFilters = (filters, config) => {
    const escapeRegex = (str) =>
        str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query = {};

    Object.entries(filters).forEach(([field, payload]) => {
        if (!payload || !config.filters?.[field]) return;

        const { type, modes } = config.filters[field];

        if (payload.mode && !modes?.includes(payload.mode)) return;

        if (!payload.mode) {
            if (type === "enum") query[field] = payload;
            else query[field] = { $regex: new RegExp(escapeRegex(payload), "i") };
            return;
        }

        const { mode, value } = payload;

        if (type === "date") {
            if (mode === "single") {
                const d = new Date(value);
                query[field] = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
            }
            if (mode === "range") {
                query[field] = { $gte: new Date(value.start), $lte: new Date(value.end) };
            }
        }

        if (type === "number") {
            if (mode === "single") query[field] = Number(value);
            if (mode === "range") query[field] = {
                $gte: Number(value.min),
                $lte: Number(value.max),
            };
        }
    });

    return query;
};
