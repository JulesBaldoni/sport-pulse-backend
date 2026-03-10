/**
 * Script de migration standalone — exécuté via tsx.
 * Lit les fichiers SQL dans src/db/migrations/ et les applique dans l'ordre.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import pino from 'pino'

const __dirname = dirname(fileURLToPath(import.meta.url))
const log = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
})

const DATABASE_URL = process.env['DATABASE_URL']
if (!DATABASE_URL) {
  log.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { max: 1 })

async function migrate(): Promise<void> {
  const migrationsDir = join(__dirname, 'migrations')
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()

  if (files.length === 0) {
    log.warn('No migration files found')
    return
  }

  // Create drizzle migrations table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `

  for (const file of files) {
    const hash = file.replace('.sql', '')
    const existing = await sql`
      SELECT id FROM "__drizzle_migrations" WHERE hash = ${hash}
    `
    if (existing.length > 0) {
      log.info(`⏭️  Already applied: ${file}`)
      continue
    }

    log.info(`▶️  Applying migration: ${file}`)
    const content = await readFile(join(migrationsDir, file), 'utf-8')

    // Split on drizzle statement-breakpoint
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)

    for (const statement of statements) {
      // Skip CONCURRENTLY indexes — they can't run in transactions
      // Run them separately
      if (statement.includes('CONCURRENTLY')) {
        await sql.unsafe(statement)
      } else {
        await sql.unsafe(statement)
      }
    }

    await sql`
      INSERT INTO "__drizzle_migrations" (hash, created_at)
      VALUES (${hash}, ${Date.now()})
    `
    log.info(`Applied: ${file}`)
  }

  log.info('All migrations applied')
}

migrate()
  .catch((err) => {
    log.error({ err }, 'Migration failed')
    process.exit(1)
  })
  .finally(() => void sql.end())
