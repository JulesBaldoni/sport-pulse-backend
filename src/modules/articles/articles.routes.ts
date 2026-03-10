import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { articlesController } from './articles.controller.js'
import type { Variables } from '@/types/hono.js'

const articlesRoutes = new Hono<{ Variables: Variables }>()

articlesRoutes.get('/', (c) => articlesController.list(c))
articlesRoutes.get('/search', (c) => articlesController.search(c))
articlesRoutes.get('/:id', (c) => articlesController.getById(c))
articlesRoutes.post('/generate', authMiddleware, (c) => articlesController.generate(c))
articlesRoutes.delete('/:id', authMiddleware, (c) => articlesController.delete(c))

export { articlesRoutes }
