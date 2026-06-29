"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromAddress = exports.verifyTransporter = exports.getTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
let transporter = null;
const getTransporter = () => {
    if (transporter) {
        return transporter;
    }
    transporter = nodemailer_1.default.createTransport({
        host: config_1.config.email.host,
        port: config_1.config.email.port,
        secure: config_1.config.email.secure,
        auth: config_1.config.email.user && config_1.config.email.password
            ? { user: config_1.config.email.user, pass: config_1.config.email.password }
            : undefined,
    });
    return transporter;
};
exports.getTransporter = getTransporter;
const verifyTransporter = async () => {
    try {
        await (0, exports.getTransporter)().verify();
        logger_1.logger.info('SMTP transporter verified');
        return true;
    }
    catch (error) {
        logger_1.logger.warn({ error }, 'SMTP transporter verification failed');
        return false;
    }
};
exports.verifyTransporter = verifyTransporter;
const fromAddress = () => `"${config_1.config.email.fromName}" <${config_1.config.email.fromEmail || config_1.config.email.user}>`;
exports.fromAddress = fromAddress;
//# sourceMappingURL=mailer.js.map