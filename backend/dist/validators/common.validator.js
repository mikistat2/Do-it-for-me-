"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParam = exports.paginationQuery = void 0;
const zod_1 = require("zod");
exports.paginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().trim().max(200).optional(),
    sortBy: zod_1.z.string().trim().max(60).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.idParam = zod_1.z.object({
    id: zod_1.z.string().uuid('A valid id is required'),
});
//# sourceMappingURL=common.validator.js.map