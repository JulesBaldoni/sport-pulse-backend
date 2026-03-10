import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Dedicated Vitest config for integration tests.
 * Uses a single fork so tests share the DB connection and run serially.
 * Env vars are injected here (before any module import) via Vitest's `env` option.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/integration/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globalSetup: ['./tests/integration/global-setup.ts'],
    setupFiles: ['./tests/integration/global-mocks.ts'],
    sequence: {
      shuffle: false,
    },
    // Inject env vars before any module is loaded — this is the key
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/sportpulse_test',
      REDIS_URL: 'redis://localhost:6379',
      PORT: '3001',
      LOG_LEVEL: 'error',
      SPORTS_API_BASE_URL: 'https://v3.football.api-sports.io',
      MISTRAL_API_KEY: 'test-key',
      SPORTS_API_KEY: 'test-key',
      GUARDIAN_API_KEY: 'test-key',
      ALLOWED_ORIGINS: '',
      REQUEST_TIMEOUT_MS: '30000',
    },
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
});


