import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ConflictError } from '@/lib/errors.js';
import { makeArticle } from '../fixtures/articles.fixture.js';
import { makeEventWithRelations } from '../fixtures/events.fixture.js';

// Mock repositories before importing the service
vi.mock('@/modules/articles/articles.repository.js', () => ({
  articlesRepository: {
    findMany: vi.fn(),
    search: vi.fn(),
    findById: vi.fn(),
    findByEventId: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    updateContent: vi.fn(),
    softDelete: vi.fn(),
  },
}));

vi.mock('@/modules/events/events.repository.js', () => ({
  eventsRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    upsertByExternalId: vi.fn(),
    findFinishedWithoutArticle: vi.fn(),
  },
}));

// Import after mocks
import { articlesService } from '@/modules/articles/articles.service.js';
import { articlesRepository } from '@/modules/articles/articles.repository.js';
import { eventsRepository } from '@/modules/events/events.repository.js';

const mockArticlesRepo = vi.mocked(articlesRepository);
const mockEventsRepo = vi.mocked(eventsRepository);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('articlesService.listArticles', () => {
  it('calls repository with correct params and returns paginated response', async () => {
    const items = [makeArticle(), makeArticle()];
    mockArticlesRepo.findMany.mockResolvedValue(items);

    const result = await articlesService.listArticles({ limit: 2 });

    expect(mockArticlesRepo.findMany).toHaveBeenCalledWith({ limit: 2 });
    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
  });

  it('detects hasMore when repository returns limit+1 items', async () => {
    const items = [makeArticle(), makeArticle(), makeArticle()];
    mockArticlesRepo.findMany.mockResolvedValue(items);

    const result = await articlesService.listArticles({ limit: 2 });

    expect(result.meta.hasMore).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});

describe('articlesService.getArticleById', () => {
  it('throws NotFoundError when repository returns null', async () => {
    mockArticlesRepo.findById.mockResolvedValue(null);
    await expect(articlesService.getArticleById('bad-id')).rejects.toThrow(NotFoundError);
  });

  it('returns article when found', async () => {
    const article = makeArticle();
    mockArticlesRepo.findById.mockResolvedValue(article as never);
    const result = await articlesService.getArticleById(article.id);
    expect(result.id).toBe(article.id);
  });
});

describe('articlesService.triggerGeneration', () => {
  const input = {
    event_id: '00000000-0000-0000-0000-000000000001',
    language: 'fr' as const,
    tone: 'neutral' as const,
  };

  it('throws NotFoundError if event does not exist', async () => {
    mockEventsRepo.findById.mockResolvedValue(null);
    await expect(articlesService.triggerGeneration(input)).rejects.toThrow(NotFoundError);
    expect(mockArticlesRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictError if article already exists for event', async () => {
    const event = makeEventWithRelations({ id: input.event_id });
    mockEventsRepo.findById.mockResolvedValue(event);
    mockArticlesRepo.findByEventId.mockResolvedValue(makeArticle());
    await expect(articlesService.triggerGeneration(input)).rejects.toThrow(ConflictError);
    expect(mockArticlesRepo.create).not.toHaveBeenCalled();
  });

  it('creates article with status pending (topic-based generation — no direct enqueue)', async () => {
    const event = makeEventWithRelations({ id: input.event_id });
    const createdArticle = makeArticle({ status: 'pending', title: '', content: '' });

    mockEventsRepo.findById.mockResolvedValue(event);
    mockArticlesRepo.findByEventId.mockResolvedValue(null);
    mockArticlesRepo.create.mockResolvedValue(createdArticle);

    const result = await articlesService.triggerGeneration(input);

    expect(mockArticlesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: input.event_id,
        status: 'pending',
        language: 'fr',
        tone: 'neutral',
      }),
    );
    // Generation is now topic-based via news-digest scheduler, not directly enqueued here
    expect(result.status).toBe('pending');
  });
});
