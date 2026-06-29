"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().trim().min(1).max(120).optional(),
        email: zod_1.z.string().trim().toLowerCase().email().optional(),
        phone: zod_1.z.string().trim().max(40).nullish(),
        portfolio: zod_1.z.string().trim().url().nullish(),
        linkedin: zod_1.z.string().trim().url().nullish(),
        github: zod_1.z.string().trim().url().nullish(),
        resumeText: zod_1.z.string().max(20000).nullish(),
        skills: zod_1.z.array(zod_1.z.string().trim().min(1)).max(200).optional(),
        preferredRoles: zod_1.z.array(zod_1.z.string().trim().min(1)).max(100).optional(),
        preferredLocations: zod_1.z.array(zod_1.z.string().trim().min(1)).max(100).optional(),
        expectedSalary: zod_1.z.coerce.number().int().min(0).nullish(),
        minMatchScore: zod_1.z.coerce.number().int().min(0).max(100).optional(),
    }),
});
//# sourceMappingURL=profile.validator.js.map