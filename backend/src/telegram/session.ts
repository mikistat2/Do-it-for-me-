import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

const sessionFile = path.resolve(
  process.env.TELEGRAM_SESSION_PATH || path.join(process.cwd(), 'storage', 'telegram.session'),
);

/**
 * Loads the persisted Telegram string session. The session is read from the
 * configured file first, falling back to the environment variable. This keeps
 * the authenticated user session out of source control while surviving
 * restarts.
 */
export const loadSession = (): string => {
  try {
    if (fs.existsSync(sessionFile)) {
      return fs.readFileSync(sessionFile, 'utf8').trim();
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to read Telegram session file');
  }
  return config.telegram.session ?? '';
};

export const saveSession = (session: string): void => {
  try {
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(sessionFile, session, { mode: 0o600 });
    logger.info('Telegram session persisted');
  } catch (error) {
    logger.error({ error }, 'Failed to persist Telegram session');
  }
};
