import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError, ValidationError, toAppError } from '@/lib/errors.js';
import { errorResponse } from '@/lib/response.js';
import { createChildLogger } from '@/lib/logger.js';
import { env } from '@/config/env.js';

const log = createChildLogger('error-middleware');

export function errorMiddleware(err: unknown, c: Context): Response {
  // Wrap ZodError into a ValidationError
  if (err instanceof ZodError) {
    const appError = new ValidationError('Validation failed', err.issues);
    log.warn({ code: appError.code, issues: err.issues }, appError.message);
    return c.json(errorResponse(appError), 400);
  }

  // Convert to AppError if not already
  const appError: AppError = err instanceof AppError ? err : toAppError(err);

  const is5xx = appError.statusCode >= 500;

  if (is5xx) {
    log.error(
      {
        code: appError.code,
        statusCode: appError.statusCode,
        stack: appError.stack,
        details: appError.details,
        isOperational: appError.isOperational,
      },
      appError.message,
    );
  } else {
    log.warn(
      { code: appError.code, statusCode: appError.statusCode },
      appError.message,
    );
  }

  // Build response — never leak stack to client in production
  const body = errorResponse(appError);
  if (is5xx && env.NODE_ENV === 'development') {
    body.error.details = {
      ...(typeof appError.details === 'object' && appError.details !== null
        ? (appError.details as Record<string, unknown>)
        : { originalDetails: appError.details }),
      stack: appError.stack,
    };
  }

  return c.json(body, appError.statusCode as Parameters<typeof c.json>[1]);
}

