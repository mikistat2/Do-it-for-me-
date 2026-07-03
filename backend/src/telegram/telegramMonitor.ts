import { Api } from 'telegram';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { getTelegramClient, getExistingClient, isTelegramConfigured } from './telegramClient';
import { channelRepository } from '../repositories/channel.repository';
import { prisma } from '../database/prisma';
import { applicationEngine } from '../jobs/applicationEngine';
import { logService } from '../services/log.service';
import { logger } from '../utils/logger';
import { LogCategory } from '@prisma/client';

const RECONNECT_CHECK_INTERVAL_MS = 30000;

let running = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let syncTimer: NodeJS.Timeout | null = null;
let handler: ((event: NewMessageEvent) => Promise<void>) | null = null;

const resolveChatId = (event: NewMessageEvent): string | null => {
  const message = event.message;
  const peer = message.peerId;
  if (peer instanceof Api.PeerChannel) {
    return (peer as any).channelId.toString();
  }
  if (peer instanceof Api.PeerChat) {
    return (peer as any).chatId.toString();
  }
  if (message.chatId) {
    return message.chatId.toString();
  }
  return null;
};

const buildHandler =
  () =>
  async (event: NewMessageEvent): Promise<void> => {
    try {
      const text = event.message?.message;
      if (!text) {
        return;
      }
      const chatId = resolveChatId(event);
      
  
      logger.info({ chatId, peerId: event.message.peerId }, 'Incoming Telegram Message Peer Info');

      if (!chatId) {
        return;
      }

      const channels = await prisma.telegramChannel.findMany({
        where: { channelId: chatId, status: 'ACTIVE' },
      });
      if (channels.length === 0) {
        return;
      }

      await logService.info(LogCategory.TELEGRAM, 'Message received', {
        chatId,
        messageId: event.message.id,
      });

      for (const channel of channels) {
        const result = await applicationEngine.processMessage({
          userId: channel.userId,
          channelId: channel.id,
          telegramMsgId: String(event.message.id),
          rawText: text,
          senderId: event.message.senderId?.toString() ?? null,
          messageDate: new Date(event.message.date * 1000),
        });
        if (result.status !== 'IGNORED') {
          await channelRepository.update(channel.id, { lastMessageAt: new Date() });
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to process Telegram message');
      await logService.error(LogCategory.TELEGRAM, 'Message processing failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

const ensureConnection = async (): Promise<void> => {
  const existing = getExistingClient();
  if (existing && existing.connected) {
    return;
  }
  try {
    const client = await getTelegramClient();
    if (handler) {
      client.addEventHandler(handler, new NewMessage({}));
    }
    await logService.info(LogCategory.TELEGRAM, 'Telegram connection (re)established');
  } catch (error) {
    logger.error({ error }, 'Telegram reconnect attempt failed');
  }
};

export const startTelegramMonitor = async (): Promise<void> => {
  if (!isTelegramConfigured()) {
    logger.warn('Telegram is not configured; monitor not started');
    return;
  }
  if (running) {
    return;
  }
  running = true;
  handler = buildHandler();

  const client = await getTelegramClient();
  client.addEventHandler(handler, new NewMessage({}));
  await logService.info(LogCategory.TELEGRAM, 'Telegram monitor started');

  reconnectTimer = setInterval(() => {
    void ensureConnection();
  }, RECONNECT_CHECK_INTERVAL_MS);

  // Background polling to ensure we never miss messages from channels
  // GramJS NewMessage events can be flaky for muted or large public channels on user accounts.
  syncTimer = setInterval(() => {
    void syncAllActiveChannels();
  }, 2 * 60 * 1000); // Every 2 minutes
};

const syncAllActiveChannels = async () => {
  if (!isTelegramConfigured()) return;
  try {
    const activeChannels = await prisma.telegramChannel.findMany({
      where: { status: 'ACTIVE' },
    });
    for (const channel of activeChannels) {
      try {
        const entity = channel.username ? channel.username : channel.channelId;
        await fetchChannelHistory(channel.id, channel.userId, entity, 10);
      } catch (e) {
        logger.warn({ error: e, channelId: channel.id }, 'Failed to sync channel in background');
      }
    }
  } catch (e) {
    logger.error({ error: e }, 'Failed to run background channel sync');
  }
};

export const stopTelegramMonitor = async (): Promise<void> => {
  running = false;
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  handler = null;
  await logService.warn(LogCategory.SYSTEM, 'Telegram monitor stopped');
};

/**
 * Fetches the last `limit` messages from a Telegram channel/group and
 * processes each one through the applicationEngine pipeline. This is used
 * both when a new channel is added (auto-fetch) and for manual sync.
 */
export const fetchChannelHistory = async (
  channelDbId: string,
  userId: string,
  telegramEntity: string,
  limit = 100,
): Promise<{ processed: number; jobs: number }> => {
  if (!isTelegramConfigured()) {
    throw new Error('Telegram is not configured');
  }

  const client = await getTelegramClient();

  let entity: Api.TypeEntityLike;
  try {
    entity = await client.getEntity(telegramEntity);
  } catch (error) {
    if (/^\d+$/.test(telegramEntity)) {
      try {
        entity = await client.getEntity(`-100${telegramEntity}`);
      } catch (error2) {
        try {
          entity = await client.getEntity(`-${telegramEntity}`);
        } catch (error3) {
          logger.error({ error: error3, telegramEntity }, 'Failed to resolve Telegram entity for history fetch');
          throw new Error(`Cannot resolve Telegram entity: ${telegramEntity}`);
        }
      }
    } else {
      logger.error({ error, telegramEntity }, 'Failed to resolve Telegram entity for history fetch');
      throw new Error(`Cannot resolve Telegram entity: ${telegramEntity}`);
    }
  }

  const messages = await client.getMessages(entity, { limit });

  await logService.info(LogCategory.TELEGRAM, 'Fetching channel history', {
    channelDbId,
    telegramEntity,
    messageCount: messages.length,
  });

  let processed = 0;
  let jobs = 0;

  for (const msg of messages) {
    const text = msg.message;
    if (!text || text.trim().length === 0) {
      continue;
    }

    try {
      const result = await applicationEngine.processMessage({
        userId,
        channelId: channelDbId,
        telegramMsgId: String(msg.id),
        rawText: text,
        senderId: msg.senderId?.toString() ?? null,
        messageDate: new Date(msg.date * 1000),
      });

      processed++;
      if (result.status !== 'IGNORED' && result.status !== 'DUPLICATE') {
        jobs++;
        await channelRepository.update(channelDbId, { lastMessageAt: new Date() });
      }
    } catch (error) {
      logger.error({ error, messageId: msg.id }, 'Failed to process historical message');
    }
  }

  await logService.info(LogCategory.TELEGRAM, 'Channel history fetch complete', {
    channelDbId,
    processed,
    jobs,
  });

  return { processed, jobs };
};

