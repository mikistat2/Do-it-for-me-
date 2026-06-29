"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTelegramLogin = void 0;
const readline_1 = __importDefault(require("readline"));
const telegram_1 = require("../../node_modules/telegram");
const sessions_1 = require("../../node_modules/telegram/sessions");
const config_1 = require("../config");
const session_1 = require("./session");
const logger_1 = require("../utils/logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prompt = (question) => {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};
const readInput = async (promptMsg, fileName) => {
    console.log(promptMsg);
    const filePath = path_1.default.join(__dirname, '..', '..', fileName);
    while (!fs_1.default.existsSync(filePath)) {
        await new Promise((r) => setTimeout(r, 1000));
    }
    const val = fs_1.default.readFileSync(filePath, 'utf8').trim();
    fs_1.default.unlinkSync(filePath);
    return val;
};
const runTelegramLogin = async () => {
    if (!config_1.config.telegram.apiId || !config_1.config.telegram.apiHash) {
        throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH must be set');
    }
    const client = new telegram_1.TelegramClient(new sessions_1.StringSession((0, session_1.loadSession)()), config_1.config.telegram.apiId, config_1.config.telegram.apiHash, { connectionRetries: 5 });
    await client.start({
        phoneNumber: async () => process.env.TELEGRAM_PHONE || prompt('Enter your phone number: '),
        password: async () => readInput('Enter your 2FA password (if any): ', 'password.txt'),
        phoneCode: async () => readInput('Enter the code you received: ', 'code.txt'),
        onError: (err) => logger_1.logger.error({ err }, 'Telegram login error'),
    });
    const session = client.session.save();
    if (typeof session === 'string') {
        (0, session_1.saveSession)(session);
        logger_1.logger.info('Telegram login successful. Session saved.');
    }
    await client.disconnect();
};
exports.runTelegramLogin = runTelegramLogin;
if (require.main === module) {
    (0, exports.runTelegramLogin)()
        .then(() => process.exit(0))
        .catch((error) => {
        logger_1.logger.error({ error }, 'Telegram login failed');
        process.exit(1);
    });
}
//# sourceMappingURL=loginManager.js.map