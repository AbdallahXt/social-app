import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export function makeRateLimiter(key: string, max?: number, windowMs?: number) {
  return rateLimit({
    windowMs: windowMs ?? env.rateLimit.windowMs,
    max: max ?? env.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `${key}:${req.ip}`,
    handler: (_req, res) => res.status(429).json({ error: 'Too many requests' })
  });
}
