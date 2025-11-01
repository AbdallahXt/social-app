import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as any;
    req.user = { id: payload.sub || payload.id, role: payload.role, email: payload.email };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function maybeAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as any;
    req.user = { id: payload.sub || payload.id, role: payload.role, email: payload.email };
  } catch {}
  return next();
}
