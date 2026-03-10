import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { errorMiddleware } from '@/middleware/error.middleware.js'
import { NotFoundError, ValidationError, ExternalServiceError } from '@/lib/errors.js'
import { z } from 'zod'

function buildTestApp(): Hono {
  const app = new Hono()
  app.onError(errorMiddleware)
  return app
}

describe('errorMiddleware — AppError subclasses', () => {
  it('returns 404 with NOT_FOUND shape for NotFoundError', async () => {
    const app = buildTestApp()
    app.get('/test', () => {
      throw new NotFoundError('Article not found')
    })

    const res = await app.request('/test')
    expect(res.status).toBe(404)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Article not found' },
    })
  })

  it('returns 400 with VALIDATION_ERROR shape for ValidationError', async () => {
    const app = buildTestApp()
    app.get('/test', () => {
      throw new ValidationError('Bad input', [{ field: 'email' }])
    })

    const res = await app.request('/test')
    expect(res.status).toBe(400)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
  })

  it('returns 502 for ExternalServiceError', async () => {
    const app = buildTestApp()
    app.get('/test', () => {
      throw new ExternalServiceError('Mistral', 'Timeout')
    })

    const res = await app.request('/test')
    expect(res.status).toBe(502)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      success: false,
      error: { code: 'EXTERNAL_SERVICE_ERROR' },
    })
  })

  it('returns 500 for unknown errors', async () => {
    const app = buildTestApp()
    app.get('/test', () => {
      throw new Error('something unexpected')
    })

    const res = await app.request('/test')
    expect(res.status).toBe(500)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR' },
    })
  })

  it('wraps ZodError as 400 VALIDATION_ERROR', async () => {
    const app = buildTestApp()
    app.get('/test', () => {
      // Trigger a real ZodError
      z.object({ name: z.string() }).parse({})
    })

    const res = await app.request('/test')
    expect(res.status).toBe(400)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
  })
})

describe('errorMiddleware — success: false shape is always present', () => {
  it('never returns success: true on error', async () => {
    const app = buildTestApp()
    app.get('/test', () => {
      throw new NotFoundError()
    })
    const res = await app.request('/test')
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(false)
  })
})
