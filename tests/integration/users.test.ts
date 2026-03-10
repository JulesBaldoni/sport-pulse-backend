import { describe, it, expect } from 'vitest'
import './setup.js'
import { GET, PATCH, seed } from './helpers.js'

interface UserBody {
  id: string
  email: string
  preferred_language: string
  preferred_sports: string[]
  password?: unknown
}

interface ErrorBody {
  success: false
  error: { code: string; message: string }
}

const enabled = process.env['SERVICES_AVAILABLE'] === 'true'

// ─── GET /api/users/me ────────────────────────────────────────────────────────

describe.runIf(enabled)('GET /api/users/me', () => {
  it('returns 401 without x-user-id header', async () => {
    const res = await GET('/api/users/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid UUID format', async () => {
    const res = await GET('/api/users/me', { 'x-user-id': 'not-a-uuid' })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown user', async () => {
    const res = await GET('/api/users/me', {
      'x-user-id': '00000000-0000-0000-0000-000000000000',
    })
    expect(res.status).toBe(404)
    const body = (await res.json()) as ErrorBody
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns user profile for known user', async () => {
    const user = await seed.user({ email: 'test@sportpulse.app' })
    const res = await GET('/api/users/me', { 'x-user-id': user.id })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: UserBody }
    expect(body.data).toMatchObject({
      id: user.id,
      email: 'test@sportpulse.app',
    })
    expect(body.data.password).toBeUndefined()
  })

  it('returns correct user shape', async () => {
    const user = await seed.user()
    const res = await GET('/api/users/me', { 'x-user-id': user.id })
    const body = (await res.json()) as { data: UserBody }
    expect(body.data).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      preferred_language: expect.any(String),
      preferred_sports: expect.any(Array),
    })
  })
})

// ─── PATCH /api/users/me/preferences ─────────────────────────────────────────

describe.runIf(enabled)('PATCH /api/users/me/preferences', () => {
  it('returns 401 without auth', async () => {
    const res = await PATCH('/api/users/me/preferences', {})
    expect(res.status).toBe(401)
  })

  it('updates preferred_language', async () => {
    const user = await seed.user()
    const res = await PATCH(
      '/api/users/me/preferences',
      { preferred_language: 'en' },
      { 'x-user-id': user.id },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: UserBody }
    expect(body.data.preferred_language).toBe('en')
  })

  it('updates preferred_sports', async () => {
    const user = await seed.user()
    const res = await PATCH(
      '/api/users/me/preferences',
      { preferred_sports: ['football', 'tennis'] },
      { 'x-user-id': user.id },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: UserBody }
    expect(body.data.preferred_sports).toEqual(expect.arrayContaining(['football', 'tennis']))
  })

  it('returns 400 for invalid language value', async () => {
    const user = await seed.user()
    const res = await PATCH(
      '/api/users/me/preferences',
      { preferred_language: 'de' },
      { 'x-user-id': user.id },
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as ErrorBody
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('is idempotent — repeated PATCH returns same result', async () => {
    const user = await seed.user()
    const headers = { 'x-user-id': user.id }

    await PATCH('/api/users/me/preferences', { preferred_language: 'en' }, headers)
    const res2 = await PATCH('/api/users/me/preferences', { preferred_language: 'en' }, headers)
    expect(res2.status).toBe(200)
    const body = (await res2.json()) as { data: UserBody }
    expect(body.data.preferred_language).toBe('en')
  })

  it('returns 404 for unknown user', async () => {
    const res = await PATCH(
      '/api/users/me/preferences',
      { preferred_language: 'en' },
      { 'x-user-id': '00000000-0000-0000-0000-000000000001' },
    )
    expect(res.status).toBe(404)
  })
})
