import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): Response =>
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} was not found`,
    },
  });
