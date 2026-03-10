import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { sports } from './sports.js'
import { articles } from './articles.js'

export const newsTopics = pgTable(
  'news_topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sport_id: uuid('sport_id')
      .notNull()
      .references(() => sports.id, { onDelete: 'cascade' }),
    entities: text('entities').array().notNull(),
    keywords: text('keywords').array().notNull(),
    headline: text('headline').notNull(),
    sources_count: integer('sources_count').notNull(),
    score: integer('score').notNull(),
    raw_excerpts: jsonb('raw_excerpts').notNull(),
    article_id: uuid('article_id').references(() => articles.id, {
      onDelete: 'set null',
    }),
    first_seen_at: timestamp('first_seen_at').notNull().defaultNow(),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('news_topics_sport_id_idx').on(table.sport_id),
    index('news_topics_score_idx').on(table.score),
    index('news_topics_first_seen_at_idx').on(table.first_seen_at),
    index('news_topics_article_id_idx').on(table.article_id),
  ],
)

export type NewsTopic = typeof newsTopics.$inferSelect
export type NewNewsTopic = typeof newsTopics.$inferInsert
