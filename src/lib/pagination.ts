import { z } from 'zod'
import { ValidationError } from '@/lib/errors.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaginationParams = {
  cursor?: string
  limit: number
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    nextCursor: string | null
    hasMore: boolean
    count: number
  }
}

// ─── Internal Zod schema ──────────────────────────────────────────────────────

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(20),
})

// UUID v4 format regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Cursor helpers ───────────────────────────────────────────────────────────

export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf-8').toString('base64url')
}

export function decodeCursor(cursor: string): string {
  let decoded: string
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf-8')
  } catch {
    throw new ValidationError('Invalid cursor: could not decode base64url value')
  }
  if (!UUID_REGEX.test(decoded)) {
    throw new ValidationError('Invalid cursor: decoded value is not a valid UUID')
  }
  return decoded
}

// ─── Param parser ─────────────────────────────────────────────────────────────

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  const result = paginationSchema.safeParse(query)
  if (!result.success) {
    throw new ValidationError('Invalid pagination parameters', result.error.issues)
  }
  return result.data
}

// ─── Response builder ─────────────────────────────────────────────────────────

export function buildPaginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number,
): PaginatedResponse<T> {
  const hasMore = items.length === limit + 1
  const data = hasMore ? items.slice(0, limit) : items
  const lastItem = data[data.length - 1]
  const nextCursor = hasMore && lastItem !== undefined ? encodeCursor(lastItem.id) : null

  return {
    data,
    meta: {
      nextCursor,
      hasMore,
      count: data.length,
    },
  }
}
