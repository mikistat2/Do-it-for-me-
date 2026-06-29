"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualSendSchema = exports.applicationIdSchema = exports.listApplicationsSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const common_validator_1 = require("./common.validator");
exports.listApplicationsSchema = zod_1.z.object({
    query: common_validator_1.paginationQuery.extend({
        status: zod_1.z.nativeEnum(client_1.ApplicationStatus).optional(),
    }),
});
exports.applicationIdSchema = zod_1.z.object({ params: common_validator_1.idParam });
exports.manualSendSchema = zod_1.z.object({
    body: zod_1.z.object({
        jobId: zod_1.z.string().uuid(),
        toEmail: zod_1.z.string().trim().toLowerCase().email(),
        subject: zod_1.z.string().trim().min(1).max(255),
        body: zod_1.z.string().trim().min(1).max(20000),
    }),
});
//# sourceMappingURL=application.validator.js.map