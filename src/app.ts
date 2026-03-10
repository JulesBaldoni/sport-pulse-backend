import { env } from '@/config/env.js'
import logger from '@/lib/logger.js'
import { errorMiddleware } from '@/middleware/error.middleware.js'
import { rateLimitMiddleware } from '@/middleware/rate-limit.middleware.js'
import { securityMiddleware } from '@/middleware/security.middleware.js'
import { corsMiddleware } from '@/middleware/cors.middleware.js'
import { requestLoggerMiddleware } from '@/middleware/request-logger.middleware.js'
import { timeoutMiddleware } from '@/middleware/timeout.middleware.js'
import { sportsRoutes } from '@/modules/sports/sports.routes.js'
import { usersRoutes } from '@/modules/users/users.routes.js'
import { eventsRoutes } from '@/modules/events/events.routes.js'
import { articlesRoutes } from '@/modules/articles/articles.routes.js'
import { openApiSpec } from '@/docs/openapi.js'
import { runNewsDigest } from '@/jobs/schedulers/news-digest.scheduler.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { Hono } from 'hono'

export const app = new Hono()

// ─── Middleware (in order) ────────────────────────────────────────────────────
// 1. Request ID + structured logging
app.use('*', requestLoggerMiddleware)
// 2. Security headers
app.use('*', securityMiddleware)
// 3. CORS
app.use('*', corsMiddleware)
// 4. Timeout
app.use('*', timeoutMiddleware)
// 5. Rate limiting
app.use('*', rateLimitMiddleware)

// 6. Error handler (catches everything above)
app.onError(errorMiddleware)

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  })
})

// OpenAPI docs
app.get('/docs/openapi.json', (c) => c.json(openApiSpec))
app.get('/docs', (c) =>
  c.html(`<!DOCTYPE html>
<html>
  <head>
    <title>SportPulse API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/docs/openapi.json"
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
    ></script>
  </body>
</html>`),
)

// Module routes
app.route('/api/sports', sportsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/events', eventsRoutes)
app.route('/api/articles', articlesRoutes)

// Admin routes
app.post('/api/admin/digest/run', authMiddleware, async (c) => {
  // Run in background — don't await
  void runNewsDigest().catch((err: unknown) => {
    logger.error({ err }, 'Manual digest run failed')
  })
  return c.json({ success: true, data: { message: 'Digest triggered' } }, 202)
})

// ─── Server start (not in test mode) ─────────────────────────────────────────
async function startServer(): Promise<void> {
  const { serve } = await import('@hono/node-server')
  const { closeDatabase } = await import('@/config/database.js')
  const { closeRedis } = await import('@/config/redis.js')
  const { startJobs, stopJobs } = await import('@/jobs/index.js')

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info(`SportPulse API running on port ${(info as { port: number }).port}`)
    startJobs()
  })

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Shutting down gracefully...`)
    try {
      await stopJobs()
      await closeDatabase()
      await closeRedis()
      logger.info('Shutdown complete')
    } catch (err) {
      logger.error({ err }, 'Error during shutdown')
    } finally {
      process.exit(0)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

if (env.NODE_ENV !== 'test') {
  await startServer()
}

export default app
