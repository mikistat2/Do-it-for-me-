import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AuthTokenPayload } from '../types';
import { UnauthorizedError } from './errors';

export const signAccessToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as SignOptions);

export const signRefreshToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as AuthTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as AuthTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};
