import type { Context } from 'hono';
import { sportsService } from './sports.service.js';
import { successResponse } from '@/lib/response.js';

export const sportsController = {
  async getAll(c: Context): Promise<Response> {
    const data = await sportsService.getAllSports();
    return c.json(successResponse(data));
  },
};

