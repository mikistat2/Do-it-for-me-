"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopScheduler = exports.startScheduler = void 0;
const refreshToken_repository_1 = require("../repositories/refreshToken.repository");
const log_service_1 = require("../services/log.service");
const client_1 = require("@prisma/client");
let cleanupTimer = null;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
/**
 * Starts background maintenance jobs. Currently prunes expired refresh tokens
 * on a fixed interval.
 */
const startScheduler = () => {
    const run = async () => {
        try {
            const removed = await refreshToken_repository_1.refreshTokenRepository.deleteExpired();
            if (removed > 0) {
                await log_service_1.logService.info(client_1.LogCategory.SYSTEM, 'Pruned expired refresh tokens', {
                    removed,
                });
            }
        }
        catch (error) {
            await log_service_1.logService.error(client_1.LogCategory.SYSTEM, 'Scheduler task failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    };
    cleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS);
    void run();
};
exports.startScheduler = startScheduler;
const stopScheduler = () => {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
};
exports.stopScheduler = stopScheduler;
//# sourceMappingURL=scheduler.js.map