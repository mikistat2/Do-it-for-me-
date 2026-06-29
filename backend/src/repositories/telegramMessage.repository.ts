import { TelegramMessage } from '@prisma/client';
import { prisma } from '../database/prisma';

export const telegramMessageRepository = {
  upsert(data: {
    channelId: string;
    telegramMsgId: string;
    rawText: string;
    senderId?: string | null;
    isJobPost: boolean;
    messageDate: Date;
  }): Promise<TelegramMessage> {
    return prisma.telegramMessage.upsert({
      where: {
        channelId_telegramMsgId: {
          channelId: data.channelId,
          telegramMsgId: data.telegramMsgId,
        },
      },
      create: data,
      update: {
        rawText: data.rawText,
        isJobPost: data.isJobPost,
        senderId: data.senderId ?? undefined,
      },
    });
  },

  exists(channelId: string, telegramMsgId: string): Promise<boolean> {
    return prisma.telegramMessage
      .count({ where: { channelId, telegramMsgId } })
      .then((count) => count > 0);
  },
};
