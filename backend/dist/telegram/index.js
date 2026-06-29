"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTelegramLogin = exports.fetchChannelHistory = exports.stopTelegramMonitor = exports.startTelegramMonitor = exports.isTelegramConfigured = exports.disconnectTelegram = exports.getTelegramClient = void 0;
var telegramClient_1 = require("./telegramClient");
Object.defineProperty(exports, "getTelegramClient", { enumerable: true, get: function () { return telegramClient_1.getTelegramClient; } });
Object.defineProperty(exports, "disconnectTelegram", { enumerable: true, get: function () { return telegramClient_1.disconnectTelegram; } });
Object.defineProperty(exports, "isTelegramConfigured", { enumerable: true, get: function () { return telegramClient_1.isTelegramConfigured; } });
var telegramMonitor_1 = require("./telegramMonitor");
Object.defineProperty(exports, "startTelegramMonitor", { enumerable: true, get: function () { return telegramMonitor_1.startTelegramMonitor; } });
Object.defineProperty(exports, "stopTelegramMonitor", { enumerable: true, get: function () { return telegramMonitor_1.stopTelegramMonitor; } });
Object.defineProperty(exports, "fetchChannelHistory", { enumerable: true, get: function () { return telegramMonitor_1.fetchChannelHistory; } });
var loginManager_1 = require("./loginManager");
Object.defineProperty(exports, "runTelegramLogin", { enumerable: true, get: function () { return loginManager_1.runTelegramLogin; } });
//# sourceMappingURL=index.js.map