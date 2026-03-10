import type { MiddlewareHandler } from 'hono';
import { AppError } from '@/lib/errors.js';

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

const store = new Map<string, RateLimitEntry>();

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown';

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
    if (entry.count > MAX_REQUESTS) {
      throw new AppError(
        'Too many requests, please try again later',
        429,
        'RATE_LIMIT_EXCEEDED',
        true,
      );
    }
  }

  await next();
};

