// backend/src/utils/permission.utils.js

/**
 * تطبيع الصلاحيات: إضافة :read تلقائيًا إذا كان هناك :update أو :delete
 * ملاحظة: الـ read المضاف يكون scope: ALL حاليًا (يمكن تعديله لاحقًا لو عايز يرث الـ scope الأضيق)
 */
export const normalizePermissions = (permissions = []) => {
    const permMap = new Map();

    permissions.forEach(perm => {
        const action = typeof perm === "string" ? perm : perm.action;
        const fullPerm = typeof perm === "string"
            ? { action: perm, scope: "ALL", units: [] }
            : perm;

        permMap.set(action, fullPerm);
    });

    const groups = [
        "users:",
        "companies:",
        "branches:",
        "reports:",
        "settings:",
        // أضف باقي الـ prefixes هنا
    ];

    groups.forEach(prefix => {
        const hasWriteAction = Array.from(permMap.keys()).some(action =>
            action.startsWith(prefix) &&
            (action.includes("create") || action.includes("update") || action.includes("delete"))
        );

        if (hasWriteAction) {
            const readAction = `${prefix}read`;
            if (!permMap.has(readAction)) {
                permMap.set(readAction, {
                    action: readAction,
                    scope: "ALL",  // حاليًا ALL، لو عايز تغيره لاحقًا ليرث الـ scope → قولي
                    units: []
                });
            }
        }
    });

    return Array.from(permMap.values());
};

/**
 * التحقق من صلاحية مع مراعاة الـ scope والـ units
 * 
 * السلوك الجديد:
 * - لو resourceUnitId === null (عمليات عامة: list, create, menu...) → مسموح بأي scope
 * - لو resourceUnitId موجود → يتم التحقق بدقة حسب ALL / OWN_UNIT / CUSTOM_UNITS
 */
export const hasPermission = (user, requiredAction, resourceUnitId = null) => {
    if (!user) return false;

    // Super Admin لديه كل الصلاحيات
    if (user.role === "SUPER_ADMIN") return true;

    const matchingPerm = user.permissions.find(perm => perm.action === requiredAction);
    if (!matchingPerm) return false;

    // لو العملية عامة (مثل جلب قائمة أو إنشاء) → نسمح بأي scope
    if (resourceUnitId === null) {
        return true; // عنده الصلاحية بأي scope → مسموح يدخل الـ endpoint
    }

    // لو العملية على resource معين → تحقق دقيق
    if (matchingPerm.scope === "ALL") return true;

    const resourceUnitStr = resourceUnitId.toString();
    const userUnitStr = user.organizationalUnit?._id?.toString() || user.organizationalUnit?.toString();

    if (matchingPerm.scope === "OWN_UNIT") {
        return userUnitStr === resourceUnitStr;
    }

    if (matchingPerm.scope === "CUSTOM_UNITS") {
        return matchingPerm.units.some(unit => unit.toString() === resourceUnitStr);
    }

    return false;
};

/**
 * التحقق من عدة صلاحيات (أي واحدة تكفي)
 */
export const hasAnyPermission = (user, permsArray, resourceUnitId = null) => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;

    const actions = Array.isArray(permsArray) ? permsArray : [permsArray];
    return actions.some(action => hasPermission(user, action, resourceUnitId));
};