import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sports } from './sports.js'
import { teams } from './teams.js'

export const eventStatusEnum = pgEnum('event_status', [
  'scheduled',
  'live',
  'finished',
  'cancelled',
])

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    external_id: text('external_id').unique().notNull(),
    sport_id: uuid('sport_id')
      .notNull()
      .references(() => sports.id, { onDelete: 'cascade' }),
    home_team_id: uuid('home_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    away_team_id: uuid('away_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    home_score: integer('home_score'),
    away_score: integer('away_score'),
    venue: text('venue'),
    competition: text('competition'),
    status: eventStatusEnum('status').notNull(),
    started_at: timestamp('started_at').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('events_sport_id_idx').on(table.sport_id),
    index('events_status_idx').on(table.status),
    index('events_started_at_idx').on(table.started_at),
  ],
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
