import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // next is required for Express to recognize this as an error handler.
  _next: NextFunction,
): Response<ErrorBody> => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'A record with these values already exists';
      details = err.meta;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'Requested record was not found';
    } else {
      statusCode = 400;
      code = 'DATABASE_ERROR';
      message = 'A database error occurred';
    }
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error({ err }, 'Unhandled error');
  } else {
    logger.warn({ code, message }, 'Handled request error');
  }

  const body: ErrorBody = {
    success: false,
    error: { code, message },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  if (!config.isProduction && err instanceof Error && statusCode >= 500) {
    body.error.details = { stack: err.stack };
  }

  return res.status(statusCode).json(body);
};
