import { z } from 'zod';
import { ChannelStatus } from '@prisma/client';
import { idParam, paginationQuery } from './common.validator';

export const listChannelsSchema = z.object({
  query: paginationQuery.extend({
    status: z.nativeEnum(ChannelStatus).optional(),
  }),
});

export const createChannelSchema = z.object({
  body: z.object({
    channelId: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(200),
    username: z.string().trim().max(120).nullish(),
  }),
});

export const updateChannelSchema = z.object({
  params: idParam,
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    status: z.nativeEnum(ChannelStatus).optional(),
  }),
});

export const channelIdSchema = z.object({ params: idParam });

export type ListChannelsQuery = z.infer<typeof listChannelsSchema>['query'];
export type CreateChannelInput = z.infer<typeof createChannelSchema>['body'];
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>['body'];
