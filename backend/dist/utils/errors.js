"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.TooManyRequestsError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message = 'Bad request', details) {
        super(message, 400, 'BAD_REQUEST', details);
    }
}
exports.BadRequestError = BadRequestError;
class ValidationError extends AppError {
    constructor(message = 'Validation failed', details) {
        super(message, 422, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', details) {
        super(message, 401, 'UNAUTHORIZED', details);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', details) {
        super(message, 403, 'FORBIDDEN', details);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', details) {
        super(message, 404, 'NOT_FOUND', details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict', details) {
        super(message, 409, 'CONFLICT', details);
    }
}
exports.ConflictError = ConflictError;
class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests', details) {
        super(message, 429, 'TOO_MANY_REQUESTS', details);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service unavailable', details) {
        super(message, 503, 'SERVICE_UNAVAILABLE', details);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
//# sourceMappingURL=errors.js.map