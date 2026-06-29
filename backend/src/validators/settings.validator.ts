import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    automationPaused: z.boolean().optional(),
    autoApply: z.boolean().optional(),
    matchThreshold: z.coerce.number().int().min(0).max(100).optional(),
    notifyOnHighScore: z.boolean().optional(),
    notifyOnSent: z.boolean().optional(),
    notifyOnFailed: z.boolean().optional(),
  }),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
