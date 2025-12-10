// utils/permission.utils.js

/**
 * تطبيع الصلاحيات: إضافة :read تلقائيًا إذا كان هناك :update أو :delete
 */
export const normalizePermissions = (permissions = []) => {
    const perms = new Set(permissions);

    const groups = [
        { prefix: "users:" },
        { prefix: "companies:" },
        { prefix: "branches:" },
        { prefix: "reports:" },
        { prefix: "settings:" },
        // أضف باقي المجموعات هنا
    ];

    groups.forEach(({ prefix }) => {
        const hasUpdate = [...perms].some(p =>
            p === `${prefix}update` || p.startsWith(`${prefix}update:`)
        );
        const hasDelete = [...perms].some(p =>
            p === `${prefix}delete` || p.startsWith(`${prefix}delete:`)
        );

        if (hasUpdate || hasDelete) {
            perms.add(`${prefix}read`);
        }
    });

    return Array.from(perms);
};

/**
 * التحقق من وجود صلاحية (يدعم sub-permissions)
 * مثال: hasPermission(user, "companies:update:updateAll")
 */
export const hasPermission = (user, requiredPerm) => {
    // السوبر أدمن لديه كل الصلاحيات
    if (user.role === "super_admin") return true;

    // إذا كانت الصلاحية عامة (مثل companies:update)
    if (user.permissions.includes(requiredPerm)) return true;

    // إذا كانت الصلاحية فرعية (مثل companies:update:updateAll)
    // نتحقق إذا كان المستخدم لديه الصلاحية الأب أو الفرعية نفسها
    const parts = requiredPerm.split(":");
    if (parts.length === 3) {
        const [module, action, subAction] = parts;
        const parentPerm = `${module}:${action}`;

        return user.permissions.includes(requiredPerm) ||
            user.permissions.includes(parentPerm);
    }

    return false;
};

/**
 * التحقق من عدة صلاحيات (أي واحدة تكفي)
 */
export const hasAnyPermission = (user, permsArray) => {
    if (user.role === "super_admin") return true;
    return permsArray.some(perm => hasPermission(user, perm));
};