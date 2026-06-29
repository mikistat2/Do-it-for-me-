"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequest = void 0;
/**
 * Basic request sanitization middleware.
 * Trims string values in body, query, and params to remove leading/trailing whitespace.
 */
const sanitizeRequest = (req, _res, next) => {
    const trimStrings = (obj) => {
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (typeof value === 'string') {
                obj[key] = value.trim();
            }
            else if (value && typeof value === 'object' && !Array.isArray(value)) {
                trimStrings(value);
            }
        }
    };
    if (req.body && typeof req.body === 'object') {
        trimStrings(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        trimStrings(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        trimStrings(req.params);
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
//# sourceMappingURL=sanitize.js.map