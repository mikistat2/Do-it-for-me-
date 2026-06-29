"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobService = void 0;
const client_1 = require("@prisma/client");
const job_repository_1 = require("../repositories/job.repository");
const pagination_1 = require("../utils/pagination");
const errors_1 = require("../utils/errors");
exports.jobService = {
    async list(filter, sort, page, pageSize) {
        const pagination = (0, pagination_1.resolvePagination)(page, pageSize);
        const { items, total } = await job_repository_1.jobRepository.list(filter, sort, pagination);
        return (0, pagination_1.buildPaginatedResult)(items, total, pagination);
    },
    async get(userId, id) {
        const job = await job_repository_1.jobRepository.findById(userId, id);
        if (!job) {
            throw new errors_1.NotFoundError('Job not found');
        }
        return job;
    },
    async archive(userId, id) {
        await this.get(userId, id);
        await job_repository_1.jobRepository.updateStatus(id, client_1.JobStatus.ARCHIVED);
    },
};
//# sourceMappingURL=job.service.js.map