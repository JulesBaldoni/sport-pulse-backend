/**
 * Setup file for integration tests.
 * Loaded by vitest BEFORE any test file — mocks Redis so no hanging connection.
 * DB connection uses DATABASE_URL (sportpulse_test) injected by vitest.integration.config.ts.
 */
import { vi } from 'vitest'

// Mock IORedis so BullMQ and redis.ts don't create a hanging connection
vi.mock('ioredis', () => {
  const mockRedis = vi.fn().mockImplementation(() => ({
    on: vi.fn().mockReturnThis(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    status: 'ready',
    // BullMQ required options
    options: { maxRetriesPerRequest: null },
  }))
  return { default: mockRedis }
})

// Mock BullMQ Queue and Worker so they don't need a real Redis
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnThis(),
  })),
  QueueEvents: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock node-cron so schedulers don't actually schedule
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn().mockReturnValue({
      stop: vi.fn(),
      destroy: vi.fn(),
    }),
  },
}))
