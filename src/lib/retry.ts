import { createChildLogger } from '@/lib/logger.js'

const log = createChildLogger('retry')

/**
 * Retries an async function up to `retries` times with exponential backoff.
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: unknown
  let delay = delayMs

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        const message = err instanceof Error ? err.message : String(err)
        log.warn(
          { attempt: attempt + 1, totalRetries: retries, error: message, nextDelayMs: delay },
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        )
        await new Promise<void>((resolve) => setTimeout(resolve, delay))
        delay *= 2
      }
    }
  }

  throw lastError
}
