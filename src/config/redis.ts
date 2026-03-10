import { env } from '@/config/env.js';
import { createChildLogger } from '@/lib/logger.js';
import { Redis as IORedis } from 'ioredis';

const log = createChildLogger('redis');

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('ready', () => {
  log.info('Redis connected');
});

redis.on('error', (err: Error) => {
  log.error({ err }, 'Redis connection error');
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
  log.info('Redis connection closed');
}



