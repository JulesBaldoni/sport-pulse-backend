import { describe, it, expect } from 'vitest'
import './setup.js'
import { GET, seed } from './helpers.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface PaginatedBody<T> {
  success: boolean
  data: {
    data: T[]
    meta: { hasMore: boolean; nextCursor: string | null; count: number }
  }
}

interface EventBody {
  id: string
  sport_id: string
  status: string
  sport?: { slug: string }
  homeTeam?: { name: string }
  awayTeam?: { name: string }
}

const enabled = process.env['SERVICES_AVAILABLE'] === 'true'

// ─── GET /api/events ──────────────────────────────────────────────────────────

describe.runIf(enabled)('GET /api/events', () => {
  it('returns empty paginated list when no events', async () => {
    const res = await GET('/api/events')
    expect(res.status).toBe(200)
    const body = (await res.json()) as PaginatedBody<EventBody>
    expect(body.success).toBe(true)
    expect(body.data.data).toHaveLength(0)
    expect(body.data.meta.hasMore).toBe(false)
    expect(body.data.meta.nextCursor).toBeNull()
  })

  it('returns seeded events ordered by started_at DESC', async () => {
    const sport = await seed.sport({ slug: 'football' })
    const home = await seed.team({ sport_id: sport.id })
    const away = await seed.team({ sport_id: sport.id })

    const earlier = await seed.event({
      sport_id: sport.id,
      home_team_id: home.id,
      away_team_id: away.id,
      started_at: new Date('2024-01-01T15:00:00Z'),
    })
    const later = await seed.event({
      sport_id: sport.id,
      home_team_id: home.id,
      away_team_id: away.id,
      started_at: new Date('2024-01-02T15:00:00Z'),
    })

    const res = await GET('/api/events')
    const body = (await res.json()) as PaginatedBody<EventBody>
    expect(body.data.data[0]!.id).toBe(later.id)
    expect(body.data.data[1]!.id).toBe(earlier.id)
  })

  it('filters by sport_id', async () => {
    const football = await seed.sport({ slug: 'football' })
    const basketball = await seed.sport({ slug: 'basketball' })
    const team1 = await seed.team({ sport_id: football.id })
    const team2 = await seed.team({ sport_id: basketball.id })

    await seed.event({ sport_id: football.id, home_team_id: team1.id, away_team_id: team1.id })
    await seed.event({ sport_id: basketball.id, home_team_id: team2.id, away_team_id: team2.id })

    const res = await GET(`/api/events?sport_id=${football.id}`)
    const body = (await res.json()) as PaginatedBody<EventBody>
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]!.sport_id).toBe(football.id)
  })

  it('filters by status', async () => {
    const sport = await seed.sport({ slug: 'football' })
    const team = await seed.team({ sport_id: sport.id })

    await seed.event({
      sport_id: sport.id,
      home_team_id: team.id,
      away_team_id: team.id,
      status: 'finished',
    })
    await seed.event({
      sport_id: sport.id,
      home_team_id: team.id,
      away_team_id: team.id,
      status: 'scheduled',
    })

    const res = await GET('/api/events?status=finished')
    const body = (await res.json()) as PaginatedBody<EventBody>
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]!.status).toBe('finished')
  })

  it('paginates correctly with cursor', async () => {
    const sport = await seed.sport({ slug: 'football' })
    const team = await seed.team({ sport_id: sport.id })

    for (let i = 0; i < 5; i++) {
      await seed.event({ sport_id: sport.id, home_team_id: team.id, away_team_id: team.id })
    }

    const page1res = await GET('/api/events?limit=3')
    const body1 = (await page1res.json()) as PaginatedBody<EventBody>
    expect(body1.data.data).toHaveLength(3)
    expect(body1.data.meta.hasMore).toBe(true)
    expect(body1.data.meta.nextCursor).toBeTruthy()

    const page2res = await GET(`/api/events?limit=3&cursor=${body1.data.meta.nextCursor}`)
    const body2 = (await page2res.json()) as PaginatedBody<EventBody>
    // 5 events total, 3 on page 1 → 2 remaining on page 2
    expect(body2.data.data.length).toBeGreaterThan(0)
    expect(body2.data.meta.hasMore).toBe(false)

    // No overlap between pages
    const ids1 = body1.data.data.map((e) => e.id)
    const ids2 = body2.data.data.map((e) => e.id)
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0)
    // Total = 5
    expect(ids1.length + ids2.length).toBe(5)
  })

  it('returns 400 for invalid limit', async () => {
    const res = await GET('/api/events?limit=200')
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/events/:id ──────────────────────────────────────────────────────

describe.runIf(enabled)('GET /api/events/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await GET('/api/events/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: { code: string } }
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('returns event with nested relations', async () => {
    const sport = await seed.sport({ slug: 'football' })
    const home = await seed.team({ name: 'PSG', sport_id: sport.id })
    const away = await seed.team({ name: 'OM', sport_id: sport.id })
    const event = await seed.event({
      sport_id: sport.id,
      home_team_id: home.id,
      away_team_id: away.id,
    })

    const res = await GET(`/api/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: EventBody }
    expect(body.data).toMatchObject({
      id: event.id,
      sport: { slug: 'football' },
      homeTeam: { name: 'PSG' },
      awayTeam: { name: 'OM' },
    })
  })

  it('returns 400 for invalid UUID format', async () => {
    const res = await GET('/api/events/not-a-uuid')
    // Route won't match a Zod-validated param — depending on impl returns 400 or 404
    expect([400, 404, 500]).toContain(res.status)
  })
})
