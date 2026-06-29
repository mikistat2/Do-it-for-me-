"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = exports.loadSession = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const sessionFile = path_1.default.resolve(process.env.TELEGRAM_SESSION_PATH || path_1.default.join(process.cwd(), 'storage', 'telegram.session'));
/**
 * Loads the persisted Telegram string session. The session is read from the
 * configured file first, falling back to the environment variable. This keeps
 * the authenticated user session out of source control while surviving
 * restarts.
 */
const loadSession = () => {
    try {
        if (fs_1.default.existsSync(sessionFile)) {
            return fs_1.default.readFileSync(sessionFile, 'utf8').trim();
        }
    }
    catch (error) {
        logger_1.logger.warn({ error }, 'Failed to read Telegram session file');
    }
    return config_1.config.telegram.session ?? '';
};
exports.loadSession = loadSession;
const saveSession = (session) => {
    try {
        fs_1.default.mkdirSync(path_1.default.dirname(sessionFile), { recursive: true });
        fs_1.default.writeFileSync(sessionFile, session, { mode: 0o600 });
        logger_1.logger.info('Telegram session persisted');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to persist Telegram session');
    }
};
exports.saveSession = saveSession;
//# sourceMappingURL=session.js.map