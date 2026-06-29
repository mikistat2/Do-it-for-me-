import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { config } from '../config';
import { loadSession, saveSession } from './session';
import { logger } from '../utils/logger';

let client: TelegramClient | null = null;

export const isTelegramConfigured = (): boolean =>
  Boolean(config.telegram.apiId && config.telegram.apiHash);

/**
 * Returns a connected TelegramClient singleton. The client is created lazily
 * from the persisted string session and configured with automatic reconnects.
 */
export const getTelegramClient = async (): Promise<TelegramClient> => {
  if (client && client.connected) {
    return client;
  }

  if (!isTelegramConfigured()) {
    throw new Error('Telegram API credentials are not configured');
  }

  const session = new StringSession(loadSession());
  client = new TelegramClient(
    session,
    config.telegram.apiId,
    config.telegram.apiHash,
    {
      connectionRetries: 10,
      retryDelay: 2000,
      autoReconnect: true,
      maxConcurrentDownloads: 1,
    },
  );

  await client.connect();
  const saved = client.session.save();
  if (typeof saved === 'string' && (saved as string).length > 0) {
    saveSession(saved);
  }
  logger.info('Telegram client connected');
  return client;
};

export const getExistingClient = (): TelegramClient | null => client;

export const disconnectTelegram = async (): Promise<void> => {
  if (client) {
    await client.disconnect();
    client = null;
    logger.info('Telegram client disconnected');
  }
};
