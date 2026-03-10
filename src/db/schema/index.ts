// Sports
export { sports } from './sports.js';
export type { Sport, NewSport } from './sports.js';

// Teams
export { teams } from './teams.js';
export type { Team, NewTeam } from './teams.js';

// Events
export { eventStatusEnum, events } from './events.js';
export type { Event, NewEvent } from './events.js';

// Articles
export { articleToneEnum, articleLanguageEnum, articleStatusEnum, articles } from './articles.js';
export type { Article, NewArticle } from './articles.js';

// Users
export { users } from './users.js';
export type { User, NewUser } from './users.js';

// News Topics
export { newsTopics } from './news_topics.js';
export type { NewsTopic, NewNewsTopic } from './news_topics.js';

// Relations
export {
  sportsRelations,
  teamsRelations,
  eventsRelations,
  articlesRelations,
} from './relations.js';

// Schema object (used by Drizzle instance)
import { sports } from './sports.js';
import { teams } from './teams.js';
import { events } from './events.js';
import { articles } from './articles.js';
import { users } from './users.js';
import { newsTopics } from './news_topics.js';
import {
  sportsRelations,
  teamsRelations,
  eventsRelations,
  articlesRelations,
} from './relations.js';

export const schema = {
  sports,
  teams,
  events,
  articles,
  users,
  newsTopics,
  sportsRelations,
  teamsRelations,
  eventsRelations,
  articlesRelations,
};
