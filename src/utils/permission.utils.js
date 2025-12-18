// utils/permission.utils.js

/**
 * تطبيع الصلاحيات: إضافة :read تلقائيًا إذا كان هناك :update أو :delete
 */
export const normalizePermissions = (permissions = []) => {
    // تحويل إلى Map عشان نتجنب التكرار مع الحفاظ على الكائن الكامل
    const permMap = new Map();

    permissions.forEach(perm => {
        const action = typeof perm === "string" ? perm : perm.action;
        // لو string قديم، نحوله إلى كائن قياسي
        const fullPerm = typeof perm === "string"
            ? { action: perm, scope: "ALL", units: [] }
            : perm;

        permMap.set(action, fullPerm);
    });

    // تحديد المجموعات اللي لازم نضيف لها read
    const groups = [
        "users:",
        "companies:",
        "branches:",
        "reports:",
        "settings:",
        // أضف باقي prefixes هنا
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
                    scope: "ALL",
                    units: []
                });
            }
        }
    });

    // رجع مصفوفة من الكائنات
    return Array.from(permMap.values());
};

/**
 * التحقق من صلاحية مع مراعاة الـ scope والـ units
 * 
 * @param {Object} user - كائن المستخدم
 * @param {string} requiredAction - الصلاحية المطلوبة مثل "companies:read"
 * @param {string|ObjectId} [resourceUnitId] - معرف الوحدة التنظيمية للـ resource (اختياري)
 * @returns {boolean}
 */
export const hasPermission = (user, requiredAction, resourceUnitId = null) => {
    // Super Admin لديه كل الصلاحيات
    if (user.role === "SUPER_ADMIN") return true;

    // البحث عن الصلاحية المطابقة
    const matchingPerm = user.permissions.find(perm => perm.action === requiredAction);

    if (!matchingPerm) return false;

    // إذا scope = ALL → مسموح دائمًا
    if (matchingPerm.scope === "ALL") return true;

    // إذا لم يكن هناك resourceUnitId (مثل عمليات عامة مثل create) → نعتمد على ALL أو OWN فقط إذا لزم
    if (!resourceUnitId) {
        // للعمليات التي لا ترتبط بوحدة معينة (مثل create أو list عام)، يمكن السماح فقط إذا ALL
        return matchingPerm.scope === "ALL";
    }

    const resourceUnit = resourceUnitId.toString();

    if (matchingPerm.scope === "OWN_UNIT") {
        return user.organizationalUnit?.toString() === resourceUnit;
    }

    if (matchingPerm.scope === "CUSTOM_UNITS") {
        return matchingPerm.units.some(unit => unit.toString() === resourceUnit);
    }

    return false;
};

/**
 * التحقق من عدة صلاحيات (أي واحدة تكفي)
 */
export const hasAnyPermission = (user, permsArray, resourceUnitId = null) => {
    if (user.role === "SUPER_ADMIN") return true;
    return permsArray.some(perm => hasPermission(user, perm, resourceUnitId));
};