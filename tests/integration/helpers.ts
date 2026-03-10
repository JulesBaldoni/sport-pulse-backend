import { testDb } from './setup.js';
import { sports, teams, events, articles, newsTopics, users } from '../../src/db/schema/index.js';
import type {
  NewSport, Sport,
  NewTeam, Team,
  NewEvent, Event,
  NewArticle, Article,
  NewNewsTopic, NewsTopic,
  NewUser, User,
} from '../../src/db/schema/index.js';
import { app } from '../../src/app.js';

// ─── HTTP helpers (use Hono's built-in test client) ───────────────────────────

const BASE = 'http://localhost';

export async function GET(
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(`${BASE}${path}`, { method: 'GET', headers });
}

export async function POST(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function PATCH(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function DELETE(
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(`${BASE}${path}`, { method: 'DELETE', headers });
}

// ─── Auth headers ─────────────────────────────────────────────────────────────

const DEFAULT_USER_ID = '10000000-0000-0000-0000-000000000001';

export async function authHeaders(userId: string = DEFAULT_USER_ID): Promise<Record<string, string>> {
  return { 'x-user-id': userId };
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

let _teamCounter = 0;
let _eventCounter = 0;
let _articleCounter = 0;
let _userCounter = 0;
let _topicCounter = 0;

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const seed = {
  async sport(overrides: Partial<NewSport> = {}): Promise<Sport> {
    const slug = overrides.slug ?? `sport-${uid()}`;
    const [row] = await testDb
      .insert(sports)
      .values({ name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, ...overrides })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      // Already exists (conflict on slug) — fetch it
      const existing = await testDb.query.sports.findFirst({
        where: (s, { eq }) => eq(s.slug, slug),
      });
      return existing!;
    }
    return row;
  },

  async team(overrides: Partial<NewTeam> = {}): Promise<Team> {
    _teamCounter++;
    const [row] = await testDb
      .insert(teams)
      .values({
        external_id: `ext-team-${_teamCounter}-${uid()}`,
        name: `Team ${_teamCounter}`,
        sport_id: overrides.sport_id ?? '00000000-0000-0000-0000-000000000000',
        ...overrides,
      })
      .returning();
    return row!;
  },

  async event(overrides: Partial<NewEvent> = {}): Promise<Event> {
    _eventCounter++;
    const [row] = await testDb
      .insert(events)
      .values({
        external_id: `ext-event-${_eventCounter}-${uid()}`,
        sport_id: overrides.sport_id ?? '00000000-0000-0000-0000-000000000000',
        home_team_id: overrides.home_team_id ?? '00000000-0000-0000-0000-000000000000',
        away_team_id: overrides.away_team_id ?? '00000000-0000-0000-0000-000000000000',
        status: 'scheduled',
        started_at: new Date(),
        competition: 'Test League',
        ...overrides,
      })
      .returning();
    return row!;
  },

  async article(overrides: Partial<NewArticle> = {}): Promise<Article> {
    _articleCounter++;
    const [row] = await testDb
      .insert(articles)
      .values({
        sport_id: overrides.sport_id ?? '00000000-0000-0000-0000-000000000000',
        title: overrides.title ?? `Article ${_articleCounter}`,
        content: overrides.content ?? `Content of article ${_articleCounter}. `.repeat(20),
        status: 'published',
        language: 'fr',
        tone: 'neutral',
        sources: [],
        ...overrides,
      })
      .returning();
    return row!;
  },

  async newsTopic(overrides: Partial<NewNewsTopic> = {}): Promise<NewsTopic> {
    _topicCounter++;
    const [row] = await testDb
      .insert(newsTopics)
      .values({
        sport_id: overrides.sport_id ?? '00000000-0000-0000-0000-000000000000',
        entities: ['TestEntity'],
        keywords: ['test'],
        headline: `Topic ${_topicCounter}`,
        sources_count: 2,
        score: 6,
        raw_excerpts: [],
        ...overrides,
      })
      .returning();
    return row!;
  },

  async user(overrides: Partial<NewUser> = {}): Promise<User> {
    _userCounter++;
    const [row] = await testDb
      .insert(users)
      .values({
        email: overrides.email ?? `user-${_userCounter}-${uid()}@test.com`,
        preferred_sports: [],
        preferred_language: 'fr',
        ...overrides,
      })
      .returning();
    return row!;
  },
};

