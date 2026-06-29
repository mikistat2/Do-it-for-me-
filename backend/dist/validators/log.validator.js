"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLogsSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const common_validator_1 = require("./common.validator");
exports.listLogsSchema = zod_1.z.object({
    query: common_validator_1.paginationQuery.extend({
        level: zod_1.z.nativeEnum(client_1.LogLevel).optional(),
        category: zod_1.z.nativeEnum(client_1.LogCategory).optional(),
    }),
});
//# sourceMappingURL=log.validator.js.map