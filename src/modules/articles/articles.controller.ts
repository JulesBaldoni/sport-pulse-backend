import type { Context } from 'hono';
import { z } from 'zod';
import { articlesService } from './articles.service.js';
import {
  listArticlesSchema,
  searchArticlesSchema,
  generateArticleSchema,
} from './articles.schema.js';
import {
  successResponse,
  paginatedSuccessResponse,
} from '@/lib/response.js';
import { ValidationError } from '@/lib/errors.js';

const idSchema = z.string().uuid();

function parseId(raw: string | undefined): string {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new ValidationError('Invalid id param');
  return result.data;
}

export const articlesController = {
  async list(c: Context): Promise<Response> {
    const query = c.req.query();
    const parsed = listArticlesSchema.safeParse(query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.issues);
    }
    const result = await articlesService.listArticles(parsed.data);
    return c.json(paginatedSuccessResponse(result));
  },

  async search(c: Context): Promise<Response> {
    const query = c.req.query();
    const parsed = searchArticlesSchema.safeParse(query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.issues);
    }
    const result = await articlesService.searchArticles(parsed.data);
    return c.json(paginatedSuccessResponse(result));
  },

  async getById(c: Context): Promise<Response> {
    const id = parseId(c.req.param('id'));
    const article = await articlesService.getArticleById(id);
    return c.json(successResponse(article));
  },

  async generate(c: Context): Promise<Response> {
    const raw = await c.req.json();
    const parsed = generateArticleSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid generate payload', parsed.error.issues);
    }
    const article = await articlesService.triggerGeneration(parsed.data);
    return c.json(successResponse(article), 202);
  },

  async delete(c: Context): Promise<Response> {
    const id = parseId(c.req.param('id'));
    await articlesService.deleteArticle(id);
    return c.json(successResponse({ deleted: true }));
  },
};




