"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const pino_http_1 = __importDefault(require("pino-http"));
const routes_1 = __importDefault(require("./routes"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const notFound_1 = require("./middleware/notFound");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const sanitize_1 = require("./middleware/sanitize");
const createApp = () => {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: config_1.config.server.corsOrigins.length > 0 ? config_1.config.server.corsOrigins : true,
        credentials: true,
    }));
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(sanitize_1.sanitizeRequest);
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok', uptime: process.uptime() });
    });
    app.use(config_1.config.server.apiPrefix, rateLimiter_1.globalRateLimiter, routes_1.default);
    app.use(notFound_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.createApp = createApp;
//# sourceMappingURL=app.js.map