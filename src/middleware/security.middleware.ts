import { createMiddleware } from 'hono/factory'
import { env } from '@/config/env.js'

export const securityMiddleware = createMiddleware(async (c, next) => {
  await next()

  // Security headers set after the response is built
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-XSS-Protection', '0')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.res.headers.set('Content-Security-Policy', "default-src 'none'")

  if (env.NODE_ENV === 'production') {
    c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Remove headers that leak server info
  c.res.headers.delete('X-Powered-By')
  c.res.headers.delete('Server')
})
