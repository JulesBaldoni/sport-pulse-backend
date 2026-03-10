import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { eventsController } from './events.controller.js'
import type { Variables } from '@/types/hono.js'

const eventsRoutes = new Hono<{ Variables: Variables }>()

eventsRoutes.get('/', (c) => eventsController.list(c))
eventsRoutes.get('/:id', (c) => eventsController.getById(c))
eventsRoutes.post('/sync', authMiddleware, (c) => eventsController.syncEvents(c))

export { eventsRoutes }
