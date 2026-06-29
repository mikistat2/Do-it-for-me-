"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNoContent = exports.sendCreated = exports.sendSuccess = void 0;
const sendSuccess = (res, data, statusCode = 200, meta) => {
    const body = { success: true, data };
    if (meta) {
        body.meta = meta;
    }
    return res.status(statusCode).json(body);
};
exports.sendSuccess = sendSuccess;
const sendCreated = (res, data) => (0, exports.sendSuccess)(res, data, 201);
exports.sendCreated = sendCreated;
const sendNoContent = (res) => res.status(204).send();
exports.sendNoContent = sendNoContent;
//# sourceMappingURL=http.js.map