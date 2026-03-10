import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const sports = pgTable('sports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export type Sport = typeof sports.$inferSelect
export type NewSport = typeof sports.$inferInsert
