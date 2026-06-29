import { LogCategory, LogLevel } from '@prisma/client';
import { logRepository, LogFilter } from '../repositories/log.repository';
import { logger } from '../utils/logger';
import { resolvePagination, buildPaginatedResult } from '../utils/pagination';

type Context = Record<string, unknown>;

/**
 * Persists structured logs to the database while also emitting them through
 * Pino. Database failures never interrupt the calling flow.
 */
const persist = async (
  level: LogLevel,
  category: LogCategory,
  message: string,
  context?: Context,
): Promise<void> => {
  try {
    await logRepository.create({
      level,
      category,
      message,
      context: context ? (context as object) : undefined,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to persist log entry');
  }
};

export const logService = {
  async record(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: Context,
  ): Promise<void> {
    logger[level.toLowerCase() as 'info'](
      { category, ...context },
      message,
    );
    await persist(level, category, message, context);
  },

  info(category: LogCategory, message: string, context?: Context) {
    return this.record(LogLevel.INFO, category, message, context);
  },

  warn(category: LogCategory, message: string, context?: Context) {
    return this.record(LogLevel.WARN, category, message, context);
  },

  error(category: LogCategory, message: string, context?: Context) {
    return this.record(LogLevel.ERROR, category, message, context);
  },

  async list(
    filter: LogFilter,
    page: number,
    pageSize: number,
  ) {
    const pagination = resolvePagination(page, pageSize);
    const { items, total } = await logRepository.list(filter, pagination);
    return buildPaginatedResult(items, total, pagination);
  },
};
