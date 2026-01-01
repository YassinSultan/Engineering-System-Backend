import { SUGGESTION_REGISTRY } from './registry.js';

export const getSuggestions = async (req, res) => {
    const { model, type = 'global', column, q, limit = 10, page = 1 } = req.query;

    const config = SUGGESTION_REGISTRY[model];
    if (!config) return res.status(400).json({ message: 'Invalid model' });

    const searchText = (q || '').trim();
    if (searchText.length < 2) return res.json({ options: [], hasMore: false, total: 0 });

    const safeLimit = Math.min(Math.max(1, Number(limit)), 50);
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;

    // ─── COLUMN SUGGESTIONS ───
    if (type === 'column') {
        const fieldType = config.allowedColumns?.[column];
        if (!fieldType) return res.status(400).json({ message: 'Invalid or not allowed column' });

        const query = {};
        let projection = column;

        if (fieldType === 'string') query[column] = { $regex: searchText, $options: 'i' };
        else if (fieldType === 'number') {
            const num = Number(searchText);
            if (Number.isNaN(num)) return res.json({ results: [], hasMore: false, total: 0 });
            query[column] = num;
            projection = `${column} _id`;
        } else return res.status(400).json({ message: 'Unsupported column type' });

        const [docs, total] = await Promise.all([
            config.model.find(query).select(projection).skip(skip).limit(safeLimit).lean(),
            config.model.countDocuments(query)
        ]);

        const values = [...new Set(docs.map(d => d[column]).filter(v => v != null))];

        return res.json({
            options: values.map(v => ({ label: String(v), value: v })),
            hasMore: docs.length === safeLimit && (skip + docs.length) < total,
            total
        });
    }

    // ─── GLOBAL SUGGESTIONS ───
    if (type === 'global') {
        const searchFields = config.globalFields || [];
        if (!searchFields.length) return res.status(500).json({ message: 'No global search fields configured' });

        const regex = new RegExp(searchText, 'i');
        const allMatches = [];

        // 1️⃣ search per field separately
        for (const field of searchFields) {
            const docs = await config.model
                .find({ [field]: { $regex: regex } })
                .select(config.defaultSelect?.join(' ') || '_id name code location')
                .lean();

            const mapped = docs.map(doc => ({
                label: doc[field],
                value: doc[field],
                matchedIn: field
            }));

            allMatches.push(...mapped);
        }

        // 2️⃣ deduplicate by value per matchedIn
        const groupsMap = new Map();
        for (const item of allMatches) {
            const groupKey = item.matchedIn;
            const itemKey = String(item.value).trim().toLowerCase();

            if (!groupsMap.has(groupKey)) groupsMap.set(groupKey, new Map());
            const group = groupsMap.get(groupKey);

            if (!group.has(itemKey)) group.set(itemKey, { value: item.value, label: item.label });
        }

        // 3️⃣ build grouped array with Arabic labels + pagination
        const groupedResults = Array.from(groupsMap.entries()).map(([groupKey, map]) => {
            const items = Array.from(map.values());

            // apply pagination
            const start = (safePage - 1) * safeLimit;
            const paginatedItems = items.slice(start, start + safeLimit);

            return {
                label: config.fieldLabels?.[groupKey] || groupKey,
                options: paginatedItems,
                total: items.length,
                hasMore: start + safeLimit < items.length
            };
        });

        return res.json({
            options: groupedResults,
            hasMore: groupedResults.some(g => g.hasMore),
            total: allMatches.length
        });
    }

    return res.status(400).json({ message: 'Invalid request type' });
};
