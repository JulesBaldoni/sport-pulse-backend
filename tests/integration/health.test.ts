import { describe, it, expect } from 'vitest'
import './setup.js'
import { GET } from './helpers.js'

const enabled = process.env['SERVICES_AVAILABLE'] === 'true'

describe.runIf(enabled)('GET /health', () => {
  it('returns 200 with correct shape', async () => {
    const res = await GET('/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      environment: 'test',
    })
  })

  it('includes security headers', async () => {
    const res = await GET('/health')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-powered-by')).toBeNull()
    expect(res.headers.get('server')).toBeNull()
  })

  it('timestamp is a valid ISO string', async () => {
    const res = await GET('/health')
    const body = (await res.json()) as { timestamp: string }
    expect(() => new Date(body.timestamp)).not.toThrow()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })
})
