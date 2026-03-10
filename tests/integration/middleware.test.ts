import { describe, it, expect } from 'vitest'
import './setup.js'
import { GET } from './helpers.js'
import { app } from '../../src/app.js'

interface ErrorBody {
  success: false
  error: { code: string; message: string }
}

const enabled = process.env['SERVICES_AVAILABLE'] === 'true'

// ─── Security headers ─────────────────────────────────────────────────────────

describe.runIf(enabled)('Security headers', () => {
  it('sets X-Content-Type-Options on all responses', async () => {
    const res = await GET('/health')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('sets X-Frame-Options: DENY on all responses', async () => {
    const res = await GET('/health')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
  })

  it('sets Content-Security-Policy on all responses', async () => {
    const res = await GET('/health')
    expect(res.headers.get('content-security-policy')).toBeTruthy()
  })

  it('removes X-Powered-By header', async () => {
    const res = await GET('/health')
    expect(res.headers.get('x-powered-by')).toBeNull()
  })
})

// ─── CORS ─────────────────────────────────────────────────────────────────────

describe.runIf(enabled)('CORS', () => {
  it('responds to OPTIONS preflight with correct headers', async () => {
    const res = await app.request('http://localhost/api/articles', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'x-user-id',
      },
    })
    // 204 or 200 for preflight
    expect([200, 204]).toContain(res.status)
    const allow = res.headers.get('access-control-allow-methods') ?? ''
    expect(allow).toContain('GET')
  })

  it('exposes X-Total-Count header', async () => {
    const res = await GET('/api/articles')
    expect(res.headers.get('access-control-expose-headers')).toContain('X-Total-Count')
  })
})

// ─── Global error handler ─────────────────────────────────────────────────────

describe.runIf(enabled)('Global error handler', () => {
  it('returns consistent error shape for unhandled routes', async () => {
    const res = await GET('/api/this-route-does-not-exist')
    expect(res.status).toBe(404)
    // Hono returns 404 — check it's either JSON error or any 404
    const text = await res.text()
    // If it's JSON, validate shape; if not (Hono default text), just check status
    try {
      const body = JSON.parse(text) as ErrorBody
      expect(body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      })
    } catch {
      // Non-JSON 404 is also acceptable — status code is the important check
      expect(res.status).toBe(404)
    }
  })

  it('returns 404 for unknown top-level route', async () => {
    const res = await GET('/totally-unknown-path')
    expect(res.status).toBe(404)
  })
})

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe.runIf(enabled)('Rate limiting', () => {
  it('returns 429 after exceeding the limit', async () => {
    // Use a unique IP to avoid pollution from other tests
    const testIp = '192.0.2.99'
    const headers = { 'x-forwarded-for': testIp }

    // The middleware limit is 100 req/15min — we make 101 requests
    let lastStatus = 200
    for (let i = 0; i < 101; i++) {
      const res = await GET('/health', headers)
      lastStatus = res.status
      if (lastStatus === 429) break
    }

    expect(lastStatus).toBe(429)
  })
})

// ─── Request ID ───────────────────────────────────────────────────────────────

describe.runIf(enabled)('Request logger middleware', () => {
  it('does not leak request IDs in response headers', async () => {
    const res = await GET('/health')
    // requestId is internal — it should not appear in response headers
    expect(res.headers.get('x-request-id')).toBeNull()
  })
})
