import pino from 'pino';
import { config } from '../config';

const transport = config.isProduction
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };

export const logger = pino({
  level: config.logging.level,
  base: { service: 'jobbot-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport,
});

export type Logger = typeof logger;

export const createChildLogger = (module: string): Logger =>
  logger.child({ module });
