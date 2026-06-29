import { logger } from './logger';

export interface RetryOptions {
  retries: number;
  delayMs: number;
  factor?: number;
  label?: string;
  onRetry?: (error: unknown, attempt: number) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes an async operation with exponential backoff retries.
 * Re-throws the last error when all attempts are exhausted.
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> => {
  const { retries, delayMs, factor = 2, label = 'operation', onRetry } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
      const waitMs = delayMs * factor ** (attempt - 1);
      logger.warn(
        { label, attempt, waitMs },
        `Retrying ${label} after failure`,
      );
      onRetry?.(error, attempt);
      await sleep(waitMs);
    }
  }

  throw lastError;
};

export { sleep };
