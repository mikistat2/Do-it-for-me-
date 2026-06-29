"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * Wraps an async Express handler so rejected promises are forwarded
 * to the global error middleware instead of crashing the process.
 */
const asyncHandler = (handler) => (req, res, next) => {
    handler(req, res, next).catch(next);
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=asyncHandler.js.map