"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        automationPaused: zod_1.z.boolean().optional(),
        autoApply: zod_1.z.boolean().optional(),
        matchThreshold: zod_1.z.coerce.number().int().min(0).max(100).optional(),
        notifyOnHighScore: zod_1.z.boolean().optional(),
        notifyOnSent: zod_1.z.boolean().optional(),
        notifyOnFailed: zod_1.z.boolean().optional(),
    }),
});
//# sourceMappingURL=settings.validator.js.map