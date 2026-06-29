import bcrypt from 'bcrypt';
import { config } from '../config';

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, config.jwt.bcryptSaltRounds);

export const verifyPassword = (
  plain: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);
