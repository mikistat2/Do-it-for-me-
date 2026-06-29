"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileService = void 0;
const profile_repository_1 = require("../repositories/profile.repository");
const errors_1 = require("../utils/errors");
exports.profileService = {
    async get(userId) {
        const profile = await profile_repository_1.profileRepository.findByUserId(userId);
        if (!profile) {
            throw new errors_1.NotFoundError('Profile not found');
        }
        return profile;
    },
    async update(userId, input) {
        await this.get(userId);
        return profile_repository_1.profileRepository.update(userId, input);
    },
};
//# sourceMappingURL=profile.service.js.map