"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const authenticate = (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        throw new errors_1.UnauthorizedError('Authorization header is missing');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
        throw new errors_1.UnauthorizedError('Access token is missing');
    }
    const payload = (0, jwt_1.verifyAccessToken)(token);
    req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
    };
    next();
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.js.map