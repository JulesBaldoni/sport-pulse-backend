import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  JobError,
  isAppError,
  toAppError,
} from '@/lib/errors.js'

describe('Error subclasses — statusCode and code', () => {
  it('NotFoundError has statusCode 404 and code NOT_FOUND', () => {
    const err = new NotFoundError('Article not found')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Article not found')
    expect(err.isOperational).toBe(true)
  })

  it('ValidationError has statusCode 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('Bad input', { field: 'email' })
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.details).toEqual({ field: 'email' })
  })

  it('UnauthorizedError has statusCode 401 and code UNAUTHORIZED', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('ForbiddenError has statusCode 403 and code FORBIDDEN', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
  })

  it('ConflictError has statusCode 409 and code CONFLICT', () => {
    const err = new ConflictError('Email already exists')
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('CONFLICT')
  })

  it('ExternalServiceError has statusCode 502 and code EXTERNAL_SERVICE_ERROR', () => {
    const err = new ExternalServiceError('Mistral', 'Failed to generate article')
    expect(err.statusCode).toBe(502)
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR')
  })

  it('JobError has statusCode 500 and code JOB_ERROR', () => {
    const err = new JobError('Worker crashed')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('JOB_ERROR')
    expect(err.isOperational).toBe(false)
  })
})

describe('ExternalServiceError — message format', () => {
  it('includes the service name in brackets', () => {
    const err = new ExternalServiceError('Guardian API', 'Rate limit exceeded')
    expect(err.message).toBe('[Guardian API] Rate limit exceeded')
  })

  it('includes the service name for Mistral', () => {
    const err = new ExternalServiceError('Mistral', 'Timeout')
    expect(err.message).toContain('[Mistral]')
    expect(err.message).toContain('Timeout')
  })
})

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new NotFoundError())).toBe(true)
    expect(isAppError(new ValidationError())).toBe(true)
    expect(isAppError(new AppError('msg', 500, 'CODE'))).toBe(true)
  })

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('plain'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isAppError('string')).toBe(false)
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError(42)).toBe(false)
  })
})

describe('toAppError', () => {
  it('returns the same AppError if already an AppError', () => {
    const original = new NotFoundError('not found')
    const result = toAppError(original)
    expect(result).toBe(original)
  })

  it('wraps a plain Error into AppError with statusCode 500', () => {
    const plain = new Error('something broke')
    const result = toAppError(plain)
    expect(isAppError(result)).toBe(true)
    expect(result.statusCode).toBe(500)
    expect(result.message).toBe('something broke')
  })

  it('wraps an unknown string into AppError with statusCode 500', () => {
    const result = toAppError('some string error')
    expect(isAppError(result)).toBe(true)
    expect(result.statusCode).toBe(500)
    expect(result.message).toBe('An unexpected error occurred')
  })

  it('wraps null into AppError with statusCode 500', () => {
    const result = toAppError(null)
    expect(isAppError(result)).toBe(true)
    expect(result.statusCode).toBe(500)
  })
})
