import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeEvent } from '../fixtures/events.fixture.js'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/integrations/sports-api/sports-api.client.js', () => ({
  sportsApiClient: {
    getRecentFinishedFixtures: vi.fn(),
    getFixtureById: vi.fn(),
  },
}))

vi.mock('@/integrations/sports-api/sports-api.mapper.js', () => ({
  mapFixture: vi.fn(),
  mapFixtureStatus: vi.fn(),
}))

vi.mock('@/modules/sports/sports.repository.js', () => ({
  sportsRepository: {
    findAll: vi.fn(),
    findBySlug: vi.fn(),
  },
}))

vi.mock('@/modules/teams/teams.repository.js', () => ({
  teamsRepository: {
    upsertByExternalId: vi.fn(),
  },
}))

vi.mock('@/modules/events/events.repository.js', () => ({
  eventsRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    upsertByExternalId: vi.fn(),
    findFinishedWithoutArticle: vi.fn(),
  },
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { runEventsSync } from '@/jobs/schedulers/events-sync.scheduler.js'
import { sportsApiClient } from '@/integrations/sports-api/sports-api.client.js'
import { mapFixture } from '@/integrations/sports-api/sports-api.mapper.js'
import { sportsRepository } from '@/modules/sports/sports.repository.js'
import { teamsRepository } from '@/modules/teams/teams.repository.js'
import { eventsRepository } from '@/modules/events/events.repository.js'
import type { RawFixture } from '@/integrations/sports-api/sports-api.mapper.js'

const mockSportsApiClient = vi.mocked(sportsApiClient)
const mockMapFixture = vi.mocked(mapFixture)
const mockSportsRepository = vi.mocked(sportsRepository)
const mockTeamsRepository = vi.mocked(teamsRepository)
const mockEventsRepository = vi.mocked(eventsRepository)

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeRawFixture(id = 1): RawFixture {
  return {
    fixture: {
      id,
      date: '2026-03-10T20:00:00Z',
      status: { short: 'FT' },
      venue: { name: 'Stade' },
    },
    league: { name: 'Ligue 1' },
    teams: {
      home: { id: 10, name: 'PSG', logo: '' },
      away: { id: 11, name: 'OM', logo: '' },
    },
    goals: { home: 2, away: 1 },
  }
}

function makeMappedFixture() {
  return {
    event: {
      external_id: '1',
      home_score: 2,
      away_score: 1,
      venue: 'Stade',
      competition: 'Ligue 1',
      status: 'finished' as const,
      started_at: new Date('2026-03-10T20:00:00Z'),
    },
    homeTeam: { external_id: '10', name: 'PSG', short_name: null, logo_url: null, country: null },
    awayTeam: { external_id: '11', name: 'OM', short_name: null, logo_url: null, country: null },
  }
}

const mockSport = {
  id: 'sport-uuid-001',
  name: 'Football',
  slug: 'football',
  created_at: new Date(),
}
const mockTeamHome = {
  id: 'team-home-001',
  external_id: '10',
  name: 'PSG',
  short_name: null,
  logo_url: null,
  sport_id: 'sport-uuid-001',
  country: null,
  created_at: new Date(),
}
const mockTeamAway = {
  id: 'team-away-001',
  external_id: '11',
  name: 'OM',
  short_name: null,
  logo_url: null,
  sport_id: 'sport-uuid-001',
  country: null,
  created_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── runEventsSync tests ──────────────────────────────────────────────────────

describe('runEventsSync', () => {
  it('fetches fixtures, upserts teams and events correctly', async () => {
    const rawFixtures = [makeRawFixture(1)]
    mockSportsApiClient.getRecentFinishedFixtures.mockResolvedValue(rawFixtures)
    mockMapFixture.mockReturnValue(makeMappedFixture())
    mockSportsRepository.findBySlug.mockResolvedValue(mockSport)
    mockTeamsRepository.upsertByExternalId
      .mockResolvedValueOnce(mockTeamHome)
      .mockResolvedValueOnce(mockTeamAway)
    mockEventsRepository.upsertByExternalId.mockResolvedValue(makeEvent())

    const count = await runEventsSync()

    expect(count).toBe(1)
    expect(mockTeamsRepository.upsertByExternalId).toHaveBeenCalledTimes(2)
    expect(mockEventsRepository.upsertByExternalId).toHaveBeenCalledTimes(1)
    expect(mockEventsRepository.upsertByExternalId).toHaveBeenCalledWith(
      expect.objectContaining({
        sport_id: mockSport.id,
        home_team_id: mockTeamHome.id,
        away_team_id: mockTeamAway.id,
      }),
    )
  })

  it('logs warn and skips fixture when sport not found', async () => {
    const rawFixtures = [makeRawFixture(1)]
    mockSportsApiClient.getRecentFinishedFixtures.mockResolvedValue(rawFixtures)
    mockSportsRepository.findBySlug.mockResolvedValue(null)

    const count = await runEventsSync()

    expect(count).toBe(0)
    expect(mockTeamsRepository.upsertByExternalId).not.toHaveBeenCalled()
    expect(mockEventsRepository.upsertByExternalId).not.toHaveBeenCalled()
  })

  it('throws when sportsApiClient throws (cron wrapper catches it)', async () => {
    mockSportsApiClient.getRecentFinishedFixtures.mockRejectedValue(new Error('API unreachable'))

    await expect(runEventsSync()).rejects.toThrow('API unreachable')
  })

  it('processes multiple fixtures correctly', async () => {
    const rawFixtures = [makeRawFixture(1), makeRawFixture(2)]
    mockSportsApiClient.getRecentFinishedFixtures.mockResolvedValue(rawFixtures)
    mockMapFixture.mockReturnValue(makeMappedFixture())
    mockSportsRepository.findBySlug.mockResolvedValue(mockSport)
    mockTeamsRepository.upsertByExternalId.mockResolvedValue(mockTeamHome)
    mockEventsRepository.upsertByExternalId.mockResolvedValue(makeEvent())

    const count = await runEventsSync()
    expect(count).toBe(2)
  })

  it('returns 0 when no fixtures fetched', async () => {
    mockSportsApiClient.getRecentFinishedFixtures.mockResolvedValue([])

    const count = await runEventsSync()

    expect(count).toBe(0)
    expect(mockEventsRepository.upsertByExternalId).not.toHaveBeenCalled()
  })
})
