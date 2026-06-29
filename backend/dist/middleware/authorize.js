"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const errors_1 = require("../utils/errors");
const authorize = (...roles) => (req, _res, next) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
        throw new errors_1.ForbiddenError('You do not have access to this resource');
    }
    next();
};
exports.authorize = authorize;
//# sourceMappingURL=authorize.js.map