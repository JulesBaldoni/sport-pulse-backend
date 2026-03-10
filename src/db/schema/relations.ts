import { relations } from 'drizzle-orm';
import { sports } from './sports.js';
import { teams } from './teams.js';
import { events } from './events.js';
import { articles } from './articles.js';

export const sportsRelations = relations(sports, ({ many }) => ({
  teams: many(teams),
  events: many(events),
  articles: many(articles),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  sport: one(sports, {
    fields: [teams.sport_id],
    references: [sports.id],
  }),
  homeEvents: many(events, { relationName: 'homeTeam' }),
  awayEvents: many(events, { relationName: 'awayTeam' }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  sport: one(sports, {
    fields: [events.sport_id],
    references: [sports.id],
  }),
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
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  event: one(events, {
    fields: [articles.event_id],
    references: [events.id],
  }),
  sport: one(sports, {
    fields: [articles.sport_id],
    references: [sports.id],
  }),
}));

