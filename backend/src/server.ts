import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { startTelegramMonitor, stopTelegramMonitor, disconnectTelegram } from './telegram';
import { startScheduler, stopScheduler } from './jobs/scheduler';

const start = async (): Promise<void> => {
  try {
    await connectDatabase();

    const app = createApp();
    const port = config.server.port;

    const server = app.listen(port, () => {
      logger.info(`Server running on http://localhost:${port}`);
      logger.info(`API prefix: ${config.server.apiPrefix}`);
      logger.info(`Environment: ${config.env}`);
    });

    // Start background services
    startScheduler();
    startTelegramMonitor().catch((error) => {
      logger.error({ error }, 'Failed to start Telegram monitor');
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received – shutting down gracefully…`);
      stopScheduler();
      await stopTelegramMonitor();
      await disconnectTelegram();
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
