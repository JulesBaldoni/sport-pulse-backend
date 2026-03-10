/**
 * Vitest setup file — sets required environment variables before any test
 * that transitively imports src/config/env.ts.
 */
process.env['NODE_ENV'] = 'test'
process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/sportpulse_test'
process.env['REDIS_URL'] = 'redis://localhost:6379'
process.env['SPORTS_API_BASE_URL'] = 'https://v3.football.api-sports.io'
process.env['LOG_LEVEL'] = 'error'
process.env['PORT'] = '3999'
process.env['MISTRAL_API_KEY'] = ''
process.env['SPORTS_API_KEY'] = ''
process.env['GUARDIAN_API_KEY'] = ''
