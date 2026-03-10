import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { articleLanguageEnum } from './articles.js'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  display_name: text('display_name'),
  preferred_sports: text('preferred_sports')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  preferred_language: articleLanguageEnum('preferred_language').notNull().default('fr'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
