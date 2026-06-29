import { Response } from 'express';

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiResponseBody<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta,
): Response<ApiResponseBody<T>> => {
  const body: ApiResponseBody<T> = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
};

export const sendCreated = <T>(res: Response, data: T): Response =>
  sendSuccess(res, data, 201);

export const sendNoContent = (res: Response): Response =>
  res.status(204).send();
