import type { Event, EventWithRelations } from '@/modules/events/events.types.js';

const BASE_UUID = '00000000-0000-0000-0000-000000000001';

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: BASE_UUID,
    external_id: 'ext-001',
    sport_id: '00000000-0000-0000-0000-000000000010',
    home_team_id: '00000000-0000-0000-0000-000000000020',
    away_team_id: '00000000-0000-0000-0000-000000000021',
    home_score: null,
    away_score: null,
    venue: 'Parc des Princes',
    competition: 'Ligue 1',
    status: 'finished',
    started_at: new Date('2026-03-01T20:00:00Z'),
    created_at: new Date('2026-03-01T18:00:00Z'),
    ...overrides,
  };
}

export function makeEventWithRelations(
  overrides: Partial<EventWithRelations> = {},
): EventWithRelations {
  const base = makeEvent(overrides);
  return {
    ...base,
    sport: {
      id: base.sport_id,
      name: 'Football',
      slug: 'football',
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
    homeTeam: {
      id: base.home_team_id,
      external_id: 'team-home-001',
      name: 'Paris Saint-Germain',
      short_name: 'PSG',
      logo_url: null,
      sport_id: base.sport_id,
      country: 'France',
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
    awayTeam: {
      id: base.away_team_id,
      external_id: 'team-away-001',
      name: 'Olympique de Marseille',
      short_name: 'OM',
      logo_url: null,
      sport_id: base.sport_id,
      country: 'France',
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
    article: null,
    ...overrides,
  };
}

