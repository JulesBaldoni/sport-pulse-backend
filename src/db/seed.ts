import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema/index.js';
import { sports } from './schema/sports.js';
import pino from 'pino';

const log = pino({ level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } });

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  log.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const connection = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(connection, { schema });

const SPORTS_TO_SEED = [
  { name: 'Football', slug: 'football' },
  { name: 'Basketball', slug: 'basketball' },
  { name: 'Tennis', slug: 'tennis' },
  { name: 'Rugby', slug: 'rugby' },
] as const;

async function seed(): Promise<void> {
  log.info('🌱 Starting database seed...');

  for (const sport of SPORTS_TO_SEED) {
    const result = await db
      .insert(sports)
      .values(sport)
      .onConflictDoNothing()
      .returning();

    if (result.length > 0) {
      log.info({ sport: result[0] }, `✅ Inserted sport: ${sport.name}`);
    } else {
      log.info(`⏭️  Skipped (already exists): ${sport.name}`);
    }
  }

  log.info('✅ Seed complete');
}

seed()
  .catch((err) => {
    log.error({ err }, 'Seed failed');
    process.exit(1);
  })
  .finally(() => {
    void connection.end();
  });

