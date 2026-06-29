import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
