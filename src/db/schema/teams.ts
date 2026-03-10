import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sports } from './sports.js';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  external_id: text('external_id').unique().notNull(),
  name: text('name').notNull(),
  short_name: text('short_name'),
  logo_url: text('logo_url'),
  sport_id: uuid('sport_id')
    .notNull()
    .references(() => sports.id, { onDelete: 'cascade' }),
  country: text('country'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

