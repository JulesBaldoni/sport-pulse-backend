/**
 * Integration test setup.
 * Env vars are injected by vitest.integration.config.ts BEFORE this file runs.
 * This file handles DB migration, seeding and per-test cleanup.
 *
 * If PostgreSQL or Redis are not reachable, all integration tests are skipped
 * gracefully (no suite failure).
 */

import { beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { schema } from '../../src/db/schema/index.js'
import { sports, users, teams, events, articles, newsTopics } from '../../src/db/schema/index.js'
import { sql } from 'drizzle-orm'
import net from 'node:net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_PATH = path.resolve(__dirname, '../../src/db/migrations')

const TEST_DB_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/sportpulse_test'

// ─── Connectivity check ───────────────────────────────────────────────────────

function checkPort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeoutMs)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

async function checkServices(): Promise<{ pg: boolean; redis: boolean }> {
  const [pg, redis] = await Promise.all([
    checkPort('127.0.0.1', 5432),
    checkPort('127.0.0.1', 6379),
  ])
  return { pg, redis }
}

export let servicesAvailable = false

// ─── Test DB connection ───────────────────────────────────────────────────────
const testConnection = postgres(TEST_DB_URL, {
  max: 5,
  connect_timeout: 3,
  onnotice: () => {}, // Silence NOTICE messages (e.g. "schema already exists")
})
export const testDb = drizzle(testConnection, { schema })

// ─── Lifecycle ────────────────────────────────────────────────────────────────
export async function setupIntegrationTests(): Promise<void> {
  await migrate(testDb, { migrationsFolder: MIGRATIONS_PATH })
  await seedBaseSports()
}

export async function teardownIntegrationTests(): Promise<void> {
  await testConnection.end()
}

export async function cleanDatabase(): Promise<void> {
  await testDb.execute(sql`
    TRUNCATE TABLE
      news_topics,
      articles,
      events,
      teams,
      users
    RESTART IDENTITY CASCADE
  `)
  await seedBaseSports()
}

async function seedBaseSports(): Promise<void> {
  await testDb
    .insert(sports)
    .values([
      { name: 'Football', slug: 'football' },
      { name: 'Basketball', slug: 'basketball' },
      { name: 'Tennis', slug: 'tennis' },
      { name: 'Rugby', slug: 'rugby' },
    ])
    .onConflictDoNothing()
}

// ─── Auto-wire lifecycle ──────────────────────────────────────────────────────
beforeAll(async () => {
  const { pg, redis } = await checkServices()
  if (!pg || !redis) {
    const missing = [!pg && 'PostgreSQL :5432', !redis && 'Redis :6379'].filter(Boolean).join(', ')
    console.warn(`\n⚠️  Integration tests SKIPPED — services not reachable: ${missing}`)
    console.warn('   Start them with: docker-compose up -d\n')
    servicesAvailable = false
    return
  }
  servicesAvailable = true
  await setupIntegrationTests()
})

afterAll(async () => {
  if (servicesAvailable) {
    await teardownIntegrationTests()
  } else {
    await testConnection.end().catch(() => {})
  }
})

beforeEach(async () => {
  if (servicesAvailable) {
    await cleanDatabase()
  }
})

export { sports, users, teams, events, articles, newsTopics }
