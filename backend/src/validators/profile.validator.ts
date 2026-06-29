import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().max(40).nullish(),
    portfolio: z.string().trim().url().nullish(),
    linkedin: z.string().trim().url().nullish(),
    github: z.string().trim().url().nullish(),
    resumeText: z.string().max(20000).nullish(),
    skills: z.array(z.string().trim().min(1)).max(200).optional(),
    preferredRoles: z.array(z.string().trim().min(1)).max(100).optional(),
    preferredLocations: z.array(z.string().trim().min(1)).max(100).optional(),
    expectedSalary: z.coerce.number().int().min(0).nullish(),
    minMatchScore: z.coerce.number().int().min(0).max(100).optional(),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
