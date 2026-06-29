import { Request, Response } from 'express';
import { logService } from '../services/log.service';
import { sendSuccess } from '../utils/http';
import { ListLogsQuery } from '../validators/log.validator';

export const logController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListLogsQuery;
    const result = await logService.list(
      { level: query.level, category: query.category, search: query.search },
      query.page,
      query.pageSize,
    );
    sendSuccess(res, result.items, 200, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    });
  },
};
