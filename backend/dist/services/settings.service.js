"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsService = void 0;
const settings_repository_1 = require("../repositories/settings.repository");
exports.settingsService = {
    get(userId) {
        return settings_repository_1.settingsRepository.ensure(userId);
    },
    async update(userId, input) {
        await settings_repository_1.settingsRepository.ensure(userId);
        return settings_repository_1.settingsRepository.update(userId, input);
    },
    async setPaused(userId, paused) {
        await settings_repository_1.settingsRepository.ensure(userId);
        return settings_repository_1.settingsRepository.update(userId, { automationPaused: paused });
    },
};
//# sourceMappingURL=settings.service.js.map