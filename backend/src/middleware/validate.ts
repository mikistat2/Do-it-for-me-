import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/**
 * Validates and replaces request body, query, and params with parsed,
 * sanitized values. Throws ZodError on failure (handled globally).
 */
export const validate =
  (schema: Schema) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    const result = parsed as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };

    if (result.body !== undefined) {
      req.body = result.body;
    }
    if (result.query !== undefined) {
      Object.assign(req.query, result.query);
    }
    if (result.params !== undefined) {
      Object.assign(req.params, result.params);
    }

    next();
  };
