import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export function generateJti() {
  return uuidv4();
}

export function signAccessToken(user: { id: string; role: 'user' | 'admin'; email: string }) {
  const payload = { sub: user.id, role: user.role, email: user.email } as const;
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn as any });
}

export function signRefreshToken(user: { id: string; role: 'user' | 'admin'; email: string }, jti: string) {
  const payload = { sub: user.id, role: user.role, email: user.email, jti } as const;
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn as any });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as any;
}
