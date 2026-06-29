"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.withRetry = void 0;
const logger_1 = require("./logger");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
/**
 * Executes an async operation with exponential backoff retries.
 * Re-throws the last error when all attempts are exhausted.
 */
const withRetry = async (operation, options) => {
    const { retries, delayMs, factor = 2, label = 'operation', onRetry } = options;
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt >= retries) {
                break;
            }
            const waitMs = delayMs * factor ** (attempt - 1);
            logger_1.logger.warn({ label, attempt, waitMs }, `Retrying ${label} after failure`);
            onRetry?.(error, attempt);
            await sleep(waitMs);
        }
    }
    throw lastError;
};
exports.withRetry = withRetry;
//# sourceMappingURL=retry.js.map