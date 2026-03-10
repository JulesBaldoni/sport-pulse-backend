import { NotFoundError, ConflictError } from '@/lib/errors.js';
import { buildPaginatedResponse } from '@/lib/pagination.js';
import type { PaginatedResponse } from '@/lib/pagination.js';
import { articlesRepository } from './articles.repository.js';
import { eventsRepository } from '@/modules/events/events.repository.js';
import type {
  Article,
  ArticleWithRelations,
  ListArticlesParams,
  SearchArticlesParams,
  GenerateArticleInput,
} from './articles.types.js';

export const articlesService = {
  async listArticles(
    params: ListArticlesParams,
  ): Promise<PaginatedResponse<Article>> {
    const items = await articlesRepository.findMany(params);
    return buildPaginatedResponse(items, params.limit);
  },

  async searchArticles(
    params: SearchArticlesParams,
  ): Promise<PaginatedResponse<Article>> {
    const items = await articlesRepository.search(params);
    return buildPaginatedResponse(items, params.limit);
  },

  async getArticleById(id: string): Promise<ArticleWithRelations> {
    const article = await articlesRepository.findById(id);
    if (!article) {
      throw new NotFoundError(`Article ${id} not found`);
    }
    return article;
  },

  async deleteArticle(id: string): Promise<void> {
    await articlesRepository.softDelete(id);
  },

  async triggerGeneration(input: GenerateArticleInput): Promise<Article> {
    // Check event exists
    const event = await eventsRepository.findById(input.event_id);
    if (!event) {
      throw new NotFoundError(`Event ${input.event_id} not found`);
    }

    // Check no article already exists for this event
    const existing = await articlesRepository.findByEventId(input.event_id);
    if (existing) {
      throw new ConflictError(
        `An article already exists for event ${input.event_id}`,
      );
    }

    // Create article with status 'pending'
    // Note: generation is now topic-based via the news-digest scheduler.
    // This endpoint creates a placeholder article linked to the event.
    const article = await articlesRepository.create({
      event_id: input.event_id,
      sport_id: event.sport_id,
      title: '',
      content: '',
      tone: input.tone,
      language: input.language,
      status: 'pending',
      sources: [],
    });

    return article;
  },
};
