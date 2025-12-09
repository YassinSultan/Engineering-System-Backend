export const escapeRegExp = function (string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};