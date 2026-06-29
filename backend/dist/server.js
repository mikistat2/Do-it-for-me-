"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const prisma_1 = require("./database/prisma");
const telegram_1 = require("./telegram");
const scheduler_1 = require("./jobs/scheduler");
const start = async () => {
    try {
        await (0, prisma_1.connectDatabase)();
        const app = (0, app_1.createApp)();
        const port = config_1.config.server.port;
        const server = app.listen(port, () => {
            logger_1.logger.info(`Server running on http://localhost:${port}`);
            logger_1.logger.info(`API prefix: ${config_1.config.server.apiPrefix}`);
            logger_1.logger.info(`Environment: ${config_1.config.env}`);
        });
        // Start background services
        (0, scheduler_1.startScheduler)();
        (0, telegram_1.startTelegramMonitor)().catch((error) => {
            logger_1.logger.error({ error }, 'Failed to start Telegram monitor');
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`${signal} received – shutting down gracefully…`);
            (0, scheduler_1.stopScheduler)();
            await (0, telegram_1.stopTelegramMonitor)();
            await (0, telegram_1.disconnectTelegram)();
            server.close(async () => {
                await (0, prisma_1.disconnectDatabase)();
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
            // Force exit after 10 seconds
            setTimeout(() => {
                logger_1.logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10_000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.fatal({ error }, 'Failed to start server');
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map