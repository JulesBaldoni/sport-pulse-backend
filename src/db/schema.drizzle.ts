/**
 * Flat schema file for drizzle-kit (no cross-file .js imports).
 * This file is used ONLY by drizzle-kit generate/migrate.
 * The application uses src/db/schema/index.ts instead.
 */
import { relations, sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Custom tsvector type (no native Drizzle support)
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

// ─── Sports ───────────────────────────────────────────────────────────────────
export const sports = pgTable('sports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// ─── Teams ────────────────────────────────────────────────────────────────────
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
})

// ─── Events ───────────────────────────────────────────────────────────────────
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

// ─── Articles ─────────────────────────────────────────────────────────────────
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

// ─── Users ────────────────────────────────────────────────────────────────────
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

// ─── News Topics ──────────────────────────────────────────────────────────────

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
    article_id: uuid('article_id').references(() => articles.id, { onDelete: 'set null' }),
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

// ─── Relations ────────────────────────────────────────────────────────────────
export const sportsRelations = relations(sports, ({ many }) => ({
  teams: many(teams),
  events: many(events),
  articles: many(articles),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  sport: one(sports, { fields: [teams.sport_id], references: [sports.id] }),
  homeEvents: many(events, { relationName: 'homeTeam' }),
  awayEvents: many(events, { relationName: 'awayTeam' }),
}))

export const eventsRelations = relations(events, ({ one }) => ({
  sport: one(sports, { fields: [events.sport_id], references: [sports.id] }),
  homeTeam: one(teams, {
    fields: [events.home_team_id],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teams, {
    fields: [events.away_team_id],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
  article: one(articles, {
    fields: [events.id],
    references: [articles.event_id],
  }),
}))

export const articlesRelations = relations(articles, ({ one }) => ({
  event: one(events, { fields: [articles.event_id], references: [events.id] }),
  sport: one(sports, { fields: [articles.sport_id], references: [sports.id] }),
}))
