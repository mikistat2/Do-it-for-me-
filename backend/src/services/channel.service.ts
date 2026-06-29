import { ChannelStatus, TelegramChannel } from '@prisma/client';
import { channelRepository, ChannelFilter } from '../repositories/channel.repository';
import { buildPaginatedResult, resolvePagination } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';
import {
  CreateChannelInput,
  UpdateChannelInput,
} from '../validators/channel.validator';
import { getTelegramClient } from '../telegram/telegramClient';
import { fetchChannelHistory } from '../telegram';
import { logger } from '../utils/logger';

export const channelService = {
  async list(filter: ChannelFilter, page: number, pageSize: number) {
    const pagination = resolvePagination(page, pageSize);
    const { items, total } = await channelRepository.list(filter, pagination);
    return buildPaginatedResult(items, total, pagination);
  },

  async create(userId: string, input: CreateChannelInput): Promise<TelegramChannel> {
    let finalChannelId = input.channelId;
    let username = input.username;

    try {
      const client = await getTelegramClient();
      if (client && client.connected) {
        let entity = await client.getEntity(input.channelId);
        
        // Handle invite links
        if (entity && 'chat' in entity && entity.chat) {
          entity = entity.chat as any;
        }

        if (entity && entity.id) {
          finalChannelId = entity.id.toString();
          if ('username' in entity && entity.username) {
            username = entity.username as string;
          }
        }
      }
    } catch (error) {
      logger.warn({ error, channelId: input.channelId }, 'Failed to resolve Telegram entity for channelId');
    }

    const channel = await channelRepository.create({
      userId,
      channelId: finalChannelId,
      title: input.title,
      username: username ?? null,
    });

    // Kick off background history fetch so existing messages are processed
    fetchChannelHistory(channel.id, userId, input.channelId, 100).catch((error) => {
      logger.error({ error, channelId: channel.id }, 'Background history fetch failed');
    });

    return channel;
  },

  async get(userId: string, id: string): Promise<TelegramChannel> {
    const channel = await channelRepository.findById(userId, id);
    if (!channel) {
      throw new NotFoundError('Channel not found');
    }
    return channel;
  },

  async update(
    userId: string,
    id: string,
    input: UpdateChannelInput,
  ): Promise<TelegramChannel> {
    await this.get(userId, id);
    return channelRepository.update(id, input);
  },

  async remove(userId: string, id: string): Promise<void> {
    await this.get(userId, id);
    await channelRepository.delete(id);
  },

  async setStatus(
    userId: string,
    id: string,
    status: ChannelStatus,
  ): Promise<TelegramChannel> {
    await this.get(userId, id);
    return channelRepository.update(id, { status });
  },

  /**
   * Manually sync a channel's history. Resolves the Telegram entity from
   * the stored channelId or username and fetches the last `limit` messages.
   */
  async syncHistory(
    userId: string,
    channelDbId: string,
    limit = 100,
  ): Promise<{ processed: number; jobs: number }> {
    const channel = await this.get(userId, channelDbId);
    const telegramEntity = channel.username
      ? channel.username
      : channel.channelId;
    return fetchChannelHistory(channelDbId, userId, telegramEntity, limit);
  },
};

