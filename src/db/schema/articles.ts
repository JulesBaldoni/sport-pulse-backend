import {
  type AnyPgColumn,
  customType,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})
import { sports } from './sports.js'
import { events } from './events.js'

export const articleToneEnum = pgEnum('article_tone', ['neutral', 'analytical', 'enthusiastic'])

export const articleLanguageEnum = pgEnum('article_language', ['fr', 'en'])

export const articleStatusEnum = pgEnum('article_status', [
  'pending',
  'generating',
  'published',
  'failed',
])

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    event_id: uuid('event_id').references((): AnyPgColumn => events.id, {
      onDelete: 'set null',
    }),
    sport_id: uuid('sport_id')
      .notNull()
      .references(() => sports.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary'),
    content: text('content').notNull(),
    tone: articleToneEnum('tone').notNull().default('neutral'),
    language: articleLanguageEnum('language').notNull().default('fr'),
    status: articleStatusEnum('status').notNull().default('pending'),
    sources: text('sources')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    generated_at: timestamp('generated_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
    search_vector: tsvector('search_vector').generatedAlwaysAs(
      sql`to_tsvector('french', coalesce(title, '') || ' ' || coalesce(content, ''))`,
    ),
  },
  (table) => [
    index('articles_sport_id_idx').on(table.sport_id),
    index('articles_status_idx').on(table.status),
    index('articles_language_idx').on(table.language),
    index('articles_created_at_idx').on(table.created_at),
    index('articles_search_vector_gin_idx').using('gin', sql`${table.search_vector}`),
  ],
)

export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
