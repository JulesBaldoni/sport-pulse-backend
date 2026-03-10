import { z } from 'zod';

export const listEventsSchema = z.object({
  sport_id: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'live', 'finished', 'cancelled']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const syncEventsSchema = z.object({
  sport_slug: z.enum(['football', 'basketball', 'tennis', 'rugby']),
});

