import { z } from 'zod';

export const listArticlesSchema = z.object({
  sport_id: z.string().uuid().optional(),
  language: z.enum(['fr', 'en']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const searchArticlesSchema = z.object({
  q: z.string().min(2).max(200),
  sport_id: z.string().uuid().optional(),
  language: z.enum(['fr', 'en']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const generateArticleSchema = z.object({
  event_id: z.string().uuid(),
  language: z.enum(['fr', 'en']).default('fr'),
  tone: z.enum(['neutral', 'analytical', 'enthusiastic']).default('neutral'),
});

