import { createMiddleware } from 'hono/factory'
import { env } from '@/config/env.js'
import { AppError } from '@/lib/errors.js'

export const timeoutMiddleware = createMiddleware(async (c, next) => {
  const timeoutMs = env.REQUEST_TIMEOUT_MS

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AppError(`Request timed out after ${timeoutMs}ms`, 408, 'REQUEST_TIMEOUT', true))
    }, timeoutMs)
  })

  try {
    await Promise.race([next(), timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
})
