import { describe, it, expect } from 'vitest'
import './setup.js'
import { GET } from './helpers.js'

const enabled = process.env['SERVICES_AVAILABLE'] === 'true'

describe.runIf(enabled)('GET /api/sports', () => {
  it('returns all 4 seeded sports', async () => {
    const res = await GET('/api/sports')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: Array<{ slug: string }> }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(4)
    expect(body.data.map((s) => s.slug)).toEqual(
      expect.arrayContaining(['football', 'basketball', 'tennis', 'rugby']),
    )
  })

  it('returns correct Sport shape', async () => {
    const res = await GET('/api/sports')
    const body = (await res.json()) as { data: unknown[] }
    const sport = body.data[0]
    expect(sport).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      slug: expect.any(String),
      created_at: expect.any(String),
    })
  })

  it('responds with success: true wrapper', async () => {
    const res = await GET('/api/sports')
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })
})
