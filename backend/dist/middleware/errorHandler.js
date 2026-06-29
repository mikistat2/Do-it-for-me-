"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const errorHandler = (err, _req, res, 
// next is required for Express to recognize this as an error handler.
_next) => {
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details;
    if (err instanceof errors_1.AppError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    }
    else if (err instanceof zod_1.ZodError) {
        statusCode = 422;
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';
        details = err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        }));
    }
    else if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            statusCode = 409;
            code = 'CONFLICT';
            message = 'A record with these values already exists';
            details = err.meta;
        }
        else if (err.code === 'P2025') {
            statusCode = 404;
            code = 'NOT_FOUND';
            message = 'Requested record was not found';
        }
        else {
            statusCode = 400;
            code = 'DATABASE_ERROR';
            message = 'A database error occurred';
        }
    }
    else if (err instanceof Error) {
        message = err.message;
    }
    if (statusCode >= 500) {
        logger_1.logger.error({ err }, 'Unhandled error');
    }
    else {
        logger_1.logger.warn({ code, message }, 'Handled request error');
    }
    const body = {
        success: false,
        error: { code, message },
    };
    if (details !== undefined) {
        body.error.details = details;
    }
    if (!config_1.config.isProduction && err instanceof Error && statusCode >= 500) {
        body.error.details = { stack: err.stack };
    }
    return res.status(statusCode).json(body);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map