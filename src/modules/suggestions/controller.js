import { SUGGESTION_REGISTRY } from './registry.js';

export const getSuggestions = async (req, res) => {
    const { model, type = 'global', column, q, limit = 8 } = req.query;

    const config = SUGGESTION_REGISTRY[model];
    if (!config) {
        return res.status(400).json({ message: 'Invalid model' });
    }

    if (!q || q.trim().length < 2) {
        return res.json({ data: [] });
    }

    const safeLimit = Math.min(Math.max(1, Number(limit) || 8), 30); // حماية

    // ─── تحقق مبكر من الـ type ───
    const validTypes = ['global', 'column'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ message: `Invalid type. Allowed: ${validTypes.join(', ')}` });
    }

    // =============== COLUMN SUGGESTIONS ===============
    if (type === 'column') {
        const fieldType = config.allowedColumns?.[column];
        if (!fieldType) {
            return res.status(400).json({ message: 'Invalid or not allowed column' });
        }

        const query = {};
        let projection = column;

        if (fieldType === 'string') {
            query[column] = { $regex: q.trim(), $options: 'i' };
        } else if (fieldType === 'number') {
            const num = Number(q.trim());
            if (Number.isNaN(num)) {
                return res.json({ data: [] });
            }
            query[column] = num;
            projection = `${column} _id`; // أحسن نرجع id كمان لو حابين
        } else {
            return res.status(400).json({ message: 'Unsupported column type' });
        }

        const docs = await config.model
            .find(query)
            .select(projection)
            .limit(safeLimit)
            .lean();

        const values = [...new Set(
            docs.map(d => d[column]).filter(v => v != null)
        )];

        return res.json({
            data: values.map(v => ({ label: String(v), value: v }))
        });
    }

    // =============== GLOBAL SUGGESTIONS ===============
    if (type === 'global') {
        // تصليح مهم جدًا ↓↓↓
        const searchFields = config.globalFields || config.globalStringFields || [];

        if (searchFields.length === 0) {
            return res.status(500).json({ message: 'No global search fields configured' });
        }

        const docs = await config.model
            .find({
                $or: searchFields.map(field => ({
                    [field]: { $regex: q.trim(), $options: 'i' }
                }))
            })
            .select(config.defaultSelect?.join(' ') || 'name code location')
            .limit(safeLimit)
            .lean();

        return res.json({
            data: docs.map(doc => ({
                // يفضل تخصيص الـ label من الكونفيج لاحقًا
                label: `${doc.name || ''} - ${doc.code || ''}`.trim(),
                value: doc.name || doc.code || '',
                // اختياري: لو هترجع للـ frontend id
                id: doc._id
            }))
        });
    }

    // لو وصلنا هنا يبقى فيه خطأ غريب
    return res.status(400).json({ message: 'Invalid request type' });
};
