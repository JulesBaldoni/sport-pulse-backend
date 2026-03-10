import type { events, sports, teams, articles } from '@/db/schema/index.js';
import type { z } from 'zod';
import type { listEventsSchema } from './events.schema.js';

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type ListEventsParams = z.infer<typeof listEventsSchema>;

export type Sport = typeof sports.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Article = typeof articles.$inferSelect;

export type EventWithRelations = Event & {
  sport: Sport;
  homeTeam: Team;
  awayTeam: Team;
  article?: Article | null;
};

