import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: config.isProduction
    ? [{ level: 'error', emit: 'event' }]
    : [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
});

prisma.$on('error', (event) => {
  logger.error({ event }, 'Prisma error');
});

if (!config.isProduction) {
  prisma.$on('warn', (event) => {
    logger.warn({ event }, 'Prisma warning');
  });
}

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('Database connection established');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
};
