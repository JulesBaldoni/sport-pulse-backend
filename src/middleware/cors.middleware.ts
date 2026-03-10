import { cors } from 'hono/cors';
import { env } from '@/config/env.js';

function getAllowedOrigins(): string[] {
  if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.trim() === '') return [];
  return env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
}

export const corsMiddleware = cors({
  origin: (origin) => {
    // Development: allow all origins
    if (env.NODE_ENV !== 'production') {
      return origin;
    }
    // Production: only listed origins
    const allowed = getAllowedOrigins();
    if (allowed.length === 0) return origin; // fallback: allow all (misconfigured)
    return allowed.includes(origin) ? origin : '';
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-user-id'],
  exposeHeaders: ['X-Total-Count'],
  maxAge: 86400,
  credentials: false,
});

