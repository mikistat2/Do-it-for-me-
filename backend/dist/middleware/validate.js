"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
/**
 * Validates and replaces request body, query, and params with parsed,
 * sanitized values. Throws ZodError on failure (handled globally).
 */
const validate = (schema) => async (req, _res, next) => {
    const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
    });
    const result = parsed;
    if (result.body !== undefined) {
        req.body = result.body;
    }
    if (result.query !== undefined) {
        Object.assign(req.query, result.query);
    }
    if (result.params !== undefined) {
        Object.assign(req.params, result.params);
    }
    next();
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map