import { Hono } from 'hono';
import { authMiddleware } from '@/middleware/auth.middleware.js';
import { usersController } from './users.controller.js';
import type { Variables } from '@/types/hono.js';

const usersRoutes = new Hono<{ Variables: Variables }>();

usersRoutes.get('/me', authMiddleware, (c) => usersController.getMe(c));
usersRoutes.patch('/me/preferences', authMiddleware, (c) =>
  usersController.updatePreferences(c),
);

export { usersRoutes };

