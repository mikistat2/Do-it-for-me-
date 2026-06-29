import { DraftStatus } from '@prisma/client';
import { draftRepository, DraftFilter } from '../repositories/draft.repository';
import { buildPaginatedResult, resolvePagination } from '../utils/pagination';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { UpdateDraftInput } from '../validators/draft.validator';

export const draftService = {
  async list(filter: DraftFilter, page: number, pageSize: number) {
    const pagination = resolvePagination(page, pageSize);
    const { items, total } = await draftRepository.list(filter, pagination);
    return buildPaginatedResult(items, total, pagination);
  },

  async get(userId: string, id: string) {
    const draft = await draftRepository.findById(userId, id);
    if (!draft) {
      throw new NotFoundError('Draft not found');
    }
    return draft;
  },

  async update(userId: string, id: string, input: UpdateDraftInput) {
    const draft = await this.get(userId, id);
    if (draft.status === DraftStatus.SENT) {
      throw new BadRequestError('A sent draft can no longer be edited');
    }
    return draftRepository.update(id, input);
  },

  async reject(userId: string, id: string) {
    const draft = await this.get(userId, id);
    if (draft.status === DraftStatus.SENT) {
      throw new BadRequestError('A sent draft cannot be rejected');
    }
    return draftRepository.updateStatus(id, DraftStatus.REJECTED);
  },
};
