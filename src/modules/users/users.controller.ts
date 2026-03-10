import type { Context } from 'hono';
import { usersService } from './users.service.js';
import { updatePreferencesSchema } from './users.schema.js';
import { successResponse } from '@/lib/response.js';
import { ValidationError } from '@/lib/errors.js';
import type { Variables } from '@/types/hono.js';

export const usersController = {
  async getMe(c: Context<{ Variables: Variables }>): Promise<Response> {
    const userId = c.get('userId');
    const user = await usersService.getMe(userId);
    return c.json(successResponse(user));
  },

  async updatePreferences(
    c: Context<{ Variables: Variables }>,
  ): Promise<Response> {
    const userId = c.get('userId');
    const raw = await c.req.json();
    const parsed = updatePreferencesSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid preferences payload', parsed.error.issues);
    }
    const user = await usersService.updatePreferences(userId, parsed.data);
    return c.json(successResponse(user));
  },
};

