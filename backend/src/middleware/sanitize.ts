import { Request, Response, NextFunction } from 'express';

/**
 * Basic request sanitization middleware.
 * Trims string values in body, query, and params to remove leading/trailing whitespace.
 */
export const sanitizeRequest = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const trimStrings = (obj: Record<string, unknown>): void => {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string') {
        obj[key] = value.trim();
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        trimStrings(value as Record<string, unknown>);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    trimStrings(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    trimStrings(req.query as Record<string, unknown>);
  }

  if (req.params && typeof req.params === 'object') {
    trimStrings(req.params as Record<string, unknown>);
  }

  next();
};
