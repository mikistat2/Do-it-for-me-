"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftService = void 0;
const client_1 = require("@prisma/client");
const draft_repository_1 = require("../repositories/draft.repository");
const pagination_1 = require("../utils/pagination");
const errors_1 = require("../utils/errors");
exports.draftService = {
    async list(filter, page, pageSize) {
        const pagination = (0, pagination_1.resolvePagination)(page, pageSize);
        const { items, total } = await draft_repository_1.draftRepository.list(filter, pagination);
        return (0, pagination_1.buildPaginatedResult)(items, total, pagination);
    },
    async get(userId, id) {
        const draft = await draft_repository_1.draftRepository.findById(userId, id);
        if (!draft) {
            throw new errors_1.NotFoundError('Draft not found');
        }
        return draft;
    },
    async update(userId, id, input) {
        const draft = await this.get(userId, id);
        if (draft.status === client_1.DraftStatus.SENT) {
            throw new errors_1.BadRequestError('A sent draft can no longer be edited');
        }
        return draft_repository_1.draftRepository.update(id, input);
    },
    async reject(userId, id) {
        const draft = await this.get(userId, id);
        if (draft.status === client_1.DraftStatus.SENT) {
            throw new errors_1.BadRequestError('A sent draft cannot be rejected');
        }
        return draft_repository_1.draftRepository.updateStatus(id, client_1.DraftStatus.REJECTED);
    },
};
//# sourceMappingURL=draft.service.js.map