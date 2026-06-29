import { NextFunction, Response } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';

export const authorize =
  (...roles: UserRole[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have access to this resource');
    }
    next();
  };
