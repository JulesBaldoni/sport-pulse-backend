import { describe, it, expect } from 'vitest';
import {
  mapFixtureStatus,
  mapFixture,
} from '@/integrations/sports-api/sports-api.mapper.js';
import type { RawFixture } from '@/integrations/sports-api/sports-api.mapper.js';

function makeRawFixture(overrides: Partial<RawFixture> = {}): RawFixture {
  return {
    fixture: {
      id: 123456,
      date: '2026-03-10T20:00:00+00:00',
      status: { short: 'FT' },
      venue: { name: 'Parc des Princes' },
    },
    league: { name: 'Ligue 1' },
    teams: {
      home: { id: 1, name: 'Paris Saint-Germain', logo: 'https://logo.psg.png' },
      away: { id: 2, name: 'Olympique de Marseille', logo: 'https://logo.om.png' },
    },
    goals: { home: 2, away: 1 },
    ...overrides,
  };
}

describe('mapFixtureStatus', () => {
  it.each([
    ['FT', 'finished'],
    ['AET', 'finished'],
    ['PEN', 'finished'],
    ['NS', 'scheduled'],
    ['TBD', 'scheduled'],
    ['LIVE', 'live'],
    ['1H', 'live'],
    ['2H', 'live'],
    ['HT', 'live'],
    ['ET', 'live'],
    ['CANC', 'cancelled'],
    ['ABD', 'cancelled'],
    ['', 'cancelled'],
    ['UNKNOWN_STATUS', 'cancelled'],
  ] as const)('maps %s → %s', (short, expected) => {
    expect(mapFixtureStatus(short)).toBe(expected);
  });
});

describe('mapFixture', () => {
  it('maps all fields to internal types correctly', () => {
    const raw = makeRawFixture();
    const mapped = mapFixture(raw);

    expect(mapped.event.external_id).toBe('123456');
    expect(typeof mapped.event.external_id).toBe('string');
    expect(mapped.event.competition).toBe('Ligue 1');
    expect(mapped.event.status).toBe('finished');
    expect(mapped.event.home_score).toBe(2);
    expect(mapped.event.away_score).toBe(1);
    expect(mapped.event.venue).toBe('Parc des Princes');
    expect(mapped.event.started_at).toBeInstanceOf(Date);
  });

  it('external_id is always a string, never a number', () => {
    const raw = makeRawFixture({ fixture: { id: 99999, date: '2026-03-10T20:00:00+00:00', status: { short: 'FT' }, venue: { name: null } } });
    const mapped = mapFixture(raw);
    expect(typeof mapped.event.external_id).toBe('string');
    expect(mapped.event.external_id).toBe('99999');
  });

  it('maps home team correctly', () => {
    const raw = makeRawFixture();
    const { homeTeam } = mapFixture(raw);
    expect(homeTeam.external_id).toBe('1');
    expect(homeTeam.name).toBe('Paris Saint-Germain');
    expect(homeTeam.logo_url).toBe('https://logo.psg.png');
    expect(homeTeam.short_name).toBeNull();
    expect(homeTeam.country).toBeNull();
  });

  it('maps away team correctly', () => {
    const raw = makeRawFixture();
    const { awayTeam } = mapFixture(raw);
    expect(awayTeam.external_id).toBe('2');
    expect(awayTeam.name).toBe('Olympique de Marseille');
  });

  it('handles null venue', () => {
    const raw = makeRawFixture({
      fixture: { id: 1, date: '2026-03-10T20:00:00+00:00', status: { short: 'NS' }, venue: { name: null } },
    });
    const mapped = mapFixture(raw);
    expect(mapped.event.venue).toBeNull();
  });

  it('handles null scores', () => {
    const raw = makeRawFixture({ goals: { home: null, away: null } });
    const mapped = mapFixture(raw);
    expect(mapped.event.home_score).toBeNull();
    expect(mapped.event.away_score).toBeNull();
  });

  it('maps started_at as a Date object', () => {
    const raw = makeRawFixture();
    const mapped = mapFixture(raw);
    expect(mapped.event.started_at).toBeInstanceOf(Date);
    expect(mapped.event.started_at.getFullYear()).toBe(2026);
  });
});

