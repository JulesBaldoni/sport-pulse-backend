import { createMiddleware } from 'hono/factory';
import { createChildLogger } from '@/lib/logger.js';

const log = createChildLogger('http');

const REDACTED_KEYS = new Set(['api_key', 'key', 'token', 'secret']);

function redactQuery(query: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    result[k] = REDACTED_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return result;
}

export const requestLoggerMiddleware = createMiddleware(async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);

  const start = Date.now();
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  const rawQuery = c.req.query();
  const query = redactQuery(rawQuery);
  const userAgent = c.req.header('user-agent') ?? '';
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown';

  log.info({ requestId, method, path, query, userAgent, ip }, 'Incoming request');

  await next();

  const durationMs = Date.now() - start;
  const statusCode = c.res.status;

  const logData = { requestId, method, path, statusCode, durationMs };

  if (statusCode >= 500) {
    log.error(logData, 'Request completed');
  } else if (statusCode >= 400) {
    log.warn(logData, 'Request completed');
  } else {
    log.info(logData, 'Request completed');
  }
});

