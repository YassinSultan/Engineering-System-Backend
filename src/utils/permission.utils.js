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
export const hasPermission = async (
    user,
    requiredAction,
    resourceUnitId = null
) => {
    if (!user) return false;

    const matchingPerm = user.permissions.find(
        perm => perm.action === requiredAction
    );

    if (!matchingPerm) return false;

    // عمليات عامة
    if (resourceUnitId === null) {
        // return matchingPerm.scope === "ALL";
        return true;
    }

    // توحيد الشكل
    const resourceUnits = Array.isArray(resourceUnitId)
        ? resourceUnitId
        : [resourceUnitId];

    if (matchingPerm.scope === "ALL") return true;

    const userUnitId =
        user.organizationalUnit?._id || user.organizationalUnit;

    // OWN_UNIT
    if (matchingPerm.scope === "OWN_UNIT") {
        return resourceUnits.some(
            unitId => unitId.toString() === userUnitId.toString()
        );
    }

    // CUSTOM_UNITS
    if (matchingPerm.scope === "CUSTOM_UNITS") {
        return resourceUnits.some(unitId =>
            matchingPerm.units.some(
                u => u.toString() === unitId.toString()
            )
        );
    }

    // OWN_UNIT_AND_CHILDREN
    if (matchingPerm.scope === "OWN_UNIT_AND_CHILDREN") {
        const units = await OrganizationalUnit
            .find({ _id: { $in: resourceUnits } })
            .select("path");

        return units.some(unit =>
            unit.path.some(
                p => p.toString() === userUnitId.toString()
            )
        );
    }

    return false;
};

/**
 * التحقق من عدة صلاحيات (أي واحدة تكفي)
 */
export const hasAnyPermission = async (
    user,
    permsArray,
    resourceUnitId = null
) => {
    if (!user) return false;

    const actions = Array.isArray(permsArray)
        ? permsArray
        : [permsArray];

    for (const action of actions) {
        const allowed = await hasPermission(user, action, resourceUnitId);
        if (allowed) return true;
    }

    return false;
};