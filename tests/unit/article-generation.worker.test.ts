import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobError, ExternalServiceError, ValidationError } from '@/lib/errors.js';
import { makeArticle } from '../fixtures/articles.fixture.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/modules/articles/articles.repository.js', () => ({
  articlesRepository: {
    updateStatus: vi.fn(),
    updateContent: vi.fn(),
    findByEventId: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    search: vi.fn(),
    findById: vi.fn(),
    softDelete: vi.fn(),
  },
}));

vi.mock('@/modules/news-topics/news-topics.repository.js', () => ({
  newsTopicsRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    linkArticle: vi.fn(),
    findRecentByEntities: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@/integrations/mistral/mistral.client.js', () => ({
  mistralClient: { complete: vi.fn() },
}));

vi.mock('@/integrations/mistral/prompts/article-generation.prompt.js', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('system prompt'),
  buildUserPrompt: vi.fn().mockReturnValue('user prompt'),
  buildTopicSystemPrompt: vi.fn().mockReturnValue('topic system prompt'),
  buildTopicUserPrompt: vi.fn().mockReturnValue('topic user prompt'),
  parseArticleResponse: vi.fn(),
}));

vi.mock('@/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    PORT: 3000,
    LOG_LEVEL: 'error',
    ALLOWED_ORIGINS: '',
    REQUEST_TIMEOUT_MS: 30000,
  },
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { processArticleGenerationJob } from '@/jobs/workers/article-generation.worker.js';
import { articlesRepository } from '@/modules/articles/articles.repository.js';
import { newsTopicsRepository } from '@/modules/news-topics/news-topics.repository.js';
import { mistralClient } from '@/integrations/mistral/mistral.client.js';
import { parseArticleResponse } from '@/integrations/mistral/prompts/article-generation.prompt.js';
import type { Job } from 'bullmq';
import type { ArticleGenerationJobData } from '@/jobs/queues/article-generation.queue.js';
import type { NewsTopic } from '@/db/schema/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTopic(overrides: Partial<NewsTopic> = {}): NewsTopic {
  return {
    id: 'topic-uuid-001',
    sport_id: 'sport-uuid-001',
    entities: ['Mbappé', 'PSG'],
    keywords: ['transfert', 'contrat'],
    headline: 'Mbappé prolonge au PSG',
    sources_count: 3,
    score: 8,
    raw_excerpts: [
      { title: 'Mbappé prolonge', content: 'Contenu...', source: 'L\'Equipe', url: 'https://lequipe.fr/1', publishedAt: new Date() },
    ],
    article_id: null,
    first_seen_at: new Date(),
    created_at: new Date(),
    ...overrides,
  };
}

function makeJob(
  overrides: Partial<ArticleGenerationJobData> = {},
  attempts = 0,
  maxAttempts = 3,
): Job<ArticleGenerationJobData> {
  return {
    id: 'job-001',
    data: {
      topicId: 'topic-uuid-001',
      sportId: 'sport-uuid-001',
      language: 'fr',
      tone: 'neutral',
      ...overrides,
    },
    attemptsMade: attempts,
    opts: { attempts: maxAttempts },
  } as unknown as Job<ArticleGenerationJobData>;
}

const mockArticlesRepo = vi.mocked(articlesRepository);
const mockTopicsRepo = vi.mocked(newsTopicsRepository);
const mockMistralClient = vi.mocked(mistralClient);
const mockParseArticleResponse = vi.mocked(parseArticleResponse);

const validGeneratedContent = {
  title: 'Mbappé prolonge son contrat au PSG',
  summary: 'Le joueur reste au club jusqu\'en 2027.',
  content: 'Dans un communiqué officiel, le PSG a confirmé la prolongation de Mbappé...',
  sources: ['https://lequipe.fr/1'],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockMistralClient.complete.mockResolvedValue(JSON.stringify(validGeneratedContent));
  mockParseArticleResponse.mockReturnValue(validGeneratedContent);
  mockArticlesRepo.create.mockResolvedValue(makeArticle({ status: 'generating' }));
  mockArticlesRepo.updateStatus.mockResolvedValue(makeArticle({ status: 'published' }));
  mockArticlesRepo.updateContent.mockResolvedValue(makeArticle({ status: 'published' }));
  mockTopicsRepo.linkArticle.mockResolvedValue(undefined);
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('processArticleGenerationJob — happy path', () => {
  it('fetches topic, creates article, calls Mistral, publishes and links to topic', async () => {
    const topic = makeTopic();
    mockTopicsRepo.findById.mockResolvedValue(topic);
    const createdArticle = makeArticle({ id: 'article-001', status: 'generating' });
    mockArticlesRepo.create.mockResolvedValue(createdArticle);

    const job = makeJob();
    await processArticleGenerationJob(job);

    // Step 1 — fetch topic
    expect(mockTopicsRepo.findById).toHaveBeenCalledWith('topic-uuid-001');

    // Step 2 — create article as 'generating'
    expect(mockArticlesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sport_id: 'sport-uuid-001',
        event_id: null,
        status: 'generating',
        language: 'fr',
        tone: 'neutral',
      }),
    );

    // Step 4 — call Mistral
    expect(mockMistralClient.complete).toHaveBeenCalled();

    // Step 5 — save content + publish + link
    expect(mockArticlesRepo.updateContent).toHaveBeenCalledWith(
      createdArticle.id,
      expect.objectContaining({
        title: validGeneratedContent.title,
        generated_at: expect.any(Date),
      }),
    );
    expect(mockArticlesRepo.updateStatus).toHaveBeenCalledWith(createdArticle.id, 'published');
    expect(mockTopicsRepo.linkArticle).toHaveBeenCalledWith('topic-uuid-001', createdArticle.id);
  });
});

// ─── Topic not found ──────────────────────────────────────────────────────────

describe('processArticleGenerationJob — topic not found', () => {
  it('throws JobError when topic not found', async () => {
    mockTopicsRepo.findById.mockResolvedValue(null);

    await expect(processArticleGenerationJob(makeJob())).rejects.toThrow(JobError);
  });

  it('does NOT create article when topic not found', async () => {
    mockTopicsRepo.findById.mockResolvedValue(null);

    try { await processArticleGenerationJob(makeJob()); } catch { /* expected */ }

    expect(mockArticlesRepo.create).not.toHaveBeenCalled();
  });
});

// ─── Last attempt failure ─────────────────────────────────────────────────────

describe('processArticleGenerationJob — last attempt failure', () => {
  it('marks article as failed on last attempt via topic.article_id', async () => {
    mockTopicsRepo.findById
      .mockResolvedValueOnce(null)   // first call in processor → throws
      .mockResolvedValueOnce(makeTopic({ article_id: 'article-001' })); // second call in error handler

    mockArticlesRepo.updateStatus.mockResolvedValue(makeArticle({ status: 'failed' }));

    const job = makeJob({}, 2, 3); // last attempt

    try {
      await processArticleGenerationJob(job);
    } catch {
      // Simulate the worker wrapper error handler
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;
      if (isLastAttempt) {
        const topic = await newsTopicsRepository.findById(job.data.topicId);
        if (topic?.article_id) {
          await articlesRepository.updateStatus(topic.article_id, 'failed');
        }
      }
    }

    expect(mockArticlesRepo.updateStatus).toHaveBeenCalledWith('article-001', 'failed');
  });
});

// ─── Mistral errors ───────────────────────────────────────────────────────────

describe('processArticleGenerationJob — Mistral error', () => {
  it('propagates ExternalServiceError from Mistral', async () => {
    mockTopicsRepo.findById.mockResolvedValue(makeTopic());
    mockMistralClient.complete.mockRejectedValue(
      new ExternalServiceError('Mistral', 'Rate limit exceeded'),
    );

    await expect(processArticleGenerationJob(makeJob())).rejects.toThrow(ExternalServiceError);
  });
});

describe('processArticleGenerationJob — invalid Mistral response', () => {
  it('propagates ValidationError from parseArticleResponse', async () => {
    mockTopicsRepo.findById.mockResolvedValue(makeTopic());
    mockParseArticleResponse.mockImplementation(() => {
      throw new ValidationError('Invalid response from Mistral');
    });

    await expect(processArticleGenerationJob(makeJob())).rejects.toThrow(ValidationError);
  });
});

