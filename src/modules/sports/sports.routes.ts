import { Hono } from 'hono';
import { sportsController } from './sports.controller.js';

const sportsRoutes = new Hono();

sportsRoutes.get('/', (c) => sportsController.getAll(c));

export { sportsRoutes };

