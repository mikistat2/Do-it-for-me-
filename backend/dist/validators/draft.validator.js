"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDraftSchema = exports.draftIdSchema = exports.listDraftsSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const common_validator_1 = require("./common.validator");
exports.listDraftsSchema = zod_1.z.object({
    query: common_validator_1.paginationQuery.extend({
        status: zod_1.z.nativeEnum(client_1.DraftStatus).optional(),
    }),
});
exports.draftIdSchema = zod_1.z.object({ params: common_validator_1.idParam });
exports.updateDraftSchema = zod_1.z.object({
    params: common_validator_1.idParam,
    body: zod_1.z.object({
        subject: zod_1.z.string().trim().min(1).max(255).optional(),
        body: zod_1.z.string().trim().min(1).max(20000).optional(),
        toEmail: zod_1.z.string().trim().toLowerCase().email().optional(),
    }),
});
//# sourceMappingURL=draft.validator.js.map