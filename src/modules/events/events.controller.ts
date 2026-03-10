import type { Context } from 'hono';
import { z } from 'zod';
import { eventsService } from './events.service.js';
import { listEventsSchema } from './events.schema.js';
import { successResponse, paginatedSuccessResponse } from '@/lib/response.js';
import { ValidationError } from '@/lib/errors.js';
import { runEventsSync } from '@/jobs/schedulers/events-sync.scheduler.js';

const idSchema = z.string().uuid();

function parseId(raw: string | undefined): string {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new ValidationError('Invalid id param');
  return result.data;
}

export const eventsController = {
  async list(c: Context): Promise<Response> {
    const query = c.req.query();
    const parsed = listEventsSchema.safeParse(query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.issues);
    }
    const result = await eventsService.listEvents(parsed.data);
    return c.json(paginatedSuccessResponse(result));
  },

  async getById(c: Context): Promise<Response> {
    const id = parseId(c.req.param('id'));
    const event = await eventsService.getEventById(id);
    return c.json(successResponse(event));
  },

  async syncEvents(c: Context): Promise<Response> {
    const synced = await runEventsSync();
    return c.json(successResponse({ synced }));
  },
};


