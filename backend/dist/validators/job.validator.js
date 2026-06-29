"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobIdSchema = exports.listJobsSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const common_validator_1 = require("./common.validator");
exports.listJobsSchema = zod_1.z.object({
    query: common_validator_1.paginationQuery.extend({
        status: zod_1.z.nativeEnum(client_1.JobStatus).optional(),
        remoteType: zod_1.z.nativeEnum(client_1.RemoteType).optional(),
        company: zod_1.z.string().trim().max(80).optional(),
        minScore: zod_1.z.coerce.number().int().min(0).max(100).optional(),
    }),
});
exports.jobIdSchema = zod_1.z.object({ params: common_validator_1.idParam });
//# sourceMappingURL=job.validator.js.map