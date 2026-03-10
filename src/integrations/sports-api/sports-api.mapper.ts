import type { NewEvent } from '@/modules/events/events.types.js'
import type { teams } from '@/db/schema/index.js'

// ─── Raw API types ────────────────────────────────────────────────────────────

export type RawFixture = {
  fixture: {
    id: number
    date: string
    status: { short: string }
    venue: { name: string | null }
  }
  league: { name: string }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

// ─── Mapped types ─────────────────────────────────────────────────────────────

type NewTeam = typeof teams.$inferInsert

export type MappedFixture = {
  event: Omit<NewEvent, 'sport_id' | 'home_team_id' | 'away_team_id'>
  homeTeam: Omit<NewTeam, 'sport_id'>
  awayTeam: Omit<NewTeam, 'sport_id'>
}

// ─── Status mapping ───────────────────────────────────────────────────────────

export function mapFixtureStatus(short: string): NewEvent['status'] {
  const FINISHED = new Set(['FT', 'AET', 'PEN'])
  const SCHEDULED = new Set(['NS', 'TBD'])
  const LIVE = new Set(['LIVE', '1H', '2H', 'HT', 'ET'])

  if (FINISHED.has(short)) return 'finished'
  if (SCHEDULED.has(short)) return 'scheduled'
  if (LIVE.has(short)) return 'live'
  return 'cancelled'
}

// ─── Fixture mapper ───────────────────────────────────────────────────────────

export function mapFixture(raw: RawFixture): MappedFixture {
  const status = mapFixtureStatus(raw.fixture.status.short)

  const event: MappedFixture['event'] = {
    external_id: String(raw.fixture.id),
    home_score: raw.goals.home,
    away_score: raw.goals.away,
    venue: raw.fixture.venue.name ?? null,
    competition: raw.league.name,
    status,
    started_at: new Date(raw.fixture.date),
  }

  const homeTeam: MappedFixture['homeTeam'] = {
    external_id: String(raw.teams.home.id),
    name: raw.teams.home.name,
    short_name: null,
    logo_url: raw.teams.home.logo || null,
    country: null,
  }

  const awayTeam: MappedFixture['awayTeam'] = {
    external_id: String(raw.teams.away.id),
    name: raw.teams.away.name,
    short_name: null,
    logo_url: raw.teams.away.logo || null,
    country: null,
  }

  return { event, homeTeam, awayTeam }
}
