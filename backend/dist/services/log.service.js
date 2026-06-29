"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logService = void 0;
const client_1 = require("@prisma/client");
const log_repository_1 = require("../repositories/log.repository");
const logger_1 = require("../utils/logger");
const pagination_1 = require("../utils/pagination");
/**
 * Persists structured logs to the database while also emitting them through
 * Pino. Database failures never interrupt the calling flow.
 */
const persist = async (level, category, message, context) => {
    try {
        await log_repository_1.logRepository.create({
            level,
            category,
            message,
            context: context ? context : undefined,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to persist log entry');
    }
};
exports.logService = {
    async record(level, category, message, context) {
        logger_1.logger[level.toLowerCase()]({ category, ...context }, message);
        await persist(level, category, message, context);
    },
    info(category, message, context) {
        return this.record(client_1.LogLevel.INFO, category, message, context);
    },
    warn(category, message, context) {
        return this.record(client_1.LogLevel.WARN, category, message, context);
    },
    error(category, message, context) {
        return this.record(client_1.LogLevel.ERROR, category, message, context);
    },
    async list(filter, page, pageSize) {
        const pagination = (0, pagination_1.resolvePagination)(page, pageSize);
        const { items, total } = await log_repository_1.logRepository.list(filter, pagination);
        return (0, pagination_1.buildPaginatedResult)(items, total, pagination);
    },
};
//# sourceMappingURL=log.service.js.map