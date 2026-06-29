import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { logService } from '../services/log.service';
import { LogCategory } from '@prisma/client';

let cleanupTimer: NodeJS.Timeout | null = null;

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Starts background maintenance jobs. Currently prunes expired refresh tokens
 * on a fixed interval.
 */
export const startScheduler = (): void => {
  const run = async (): Promise<void> => {
    try {
      const removed = await refreshTokenRepository.deleteExpired();
      if (removed > 0) {
        await logService.info(LogCategory.SYSTEM, 'Pruned expired refresh tokens', {
          removed,
        });
      }
    } catch (error) {
      await logService.error(LogCategory.SYSTEM, 'Scheduler task failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  cleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS);
  void run();
};

export const stopScheduler = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};
