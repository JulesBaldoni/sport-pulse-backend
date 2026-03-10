import { env } from '@/config/env.js';
import { createChildLogger } from '@/lib/logger.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from '@/db/schema/index.js';

const log = createChildLogger('database');

const connection = postgres(env.DATABASE_URL, {
  max: 10,
});

export const db = drizzle(connection, { schema });

log.info('Database connected');

export async function closeDatabase(): Promise<void> {
  await connection.end();
  log.info('Database connection closed');
}
