"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
exports.prisma = new client_1.PrismaClient({
    log: config_1.config.isProduction
        ? [{ level: 'error', emit: 'event' }]
        : [
            { level: 'warn', emit: 'event' },
            { level: 'error', emit: 'event' },
        ],
});
exports.prisma.$on('error', (event) => {
    logger_1.logger.error({ event }, 'Prisma error');
});
if (!config_1.config.isProduction) {
    exports.prisma.$on('warn', (event) => {
        logger_1.logger.warn({ event }, 'Prisma warning');
    });
}
const connectDatabase = async () => {
    await exports.prisma.$connect();
    logger_1.logger.info('Database connection established');
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    await exports.prisma.$disconnect();
    logger_1.logger.info('Database connection closed');
};
exports.disconnectDatabase = disconnectDatabase;
//# sourceMappingURL=prisma.js.map