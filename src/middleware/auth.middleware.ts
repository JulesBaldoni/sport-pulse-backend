import type { MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { UnauthorizedError } from '@/lib/errors.js';
import type { Variables } from '@/types/hono.js';

const uuidSchema = z.string().uuid();

export const authMiddleware: MiddlewareHandler<{ Variables: Variables }> = async (
  c,
  next,
) => {
  const userId = c.req.header('x-user-id');

  if (!userId || userId.trim() === '') {
    throw new UnauthorizedError('Missing x-user-id header');
  }

  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) {
    throw new UnauthorizedError('Invalid x-user-id: must be a valid UUID');
  }

  c.set('userId', parsed.data);
  await next();
};

