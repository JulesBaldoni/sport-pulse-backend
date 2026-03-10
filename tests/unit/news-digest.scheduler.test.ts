import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runNewsDigest } from '@/jobs/schedulers/news-digest.scheduler.js'
import type * as TopicDetector from '@/lib/topic-detector.js'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/modules/sports/sports.repository.js', () => ({
  sportsRepository: { findAll: vi.fn() },
}))

vi.mock('@/modules/news-topics/news-topics.repository.js', () => ({
  newsTopicsRepository: {
    findRecentByEntities: vi.fn(),
    create: vi.fn(),
    linkArticle: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock('@/integrations/news-scraper/news-scraper.service.js', () => ({
  newsScraperService: { getLatestNewsBySport: vi.fn() },
}))

vi.mock('@/lib/topic-detector.js', async (importOriginal) => {
  const actual = await importOriginal<typeof TopicDetector>()
  return {
    ...actual,
    detectHotTopics: vi.fn(),
  }
})

vi.mock('@/jobs/queues/article-generation.queue.js', () => ({
  enqueueArticleGeneration: vi.fn().mockResolvedValue(undefined),
}))

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
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { sportsRepository } from '@/modules/sports/sports.repository.js'
import { newsTopicsRepository } from '@/modules/news-topics/news-topics.repository.js'
import { newsScraperService } from '@/integrations/news-scraper/news-scraper.service.js'
import { detectHotTopics } from '@/lib/topic-detector.js'
import { enqueueArticleGeneration } from '@/jobs/queues/article-generation.queue.js'
import type { Sport } from '@/db/schema/index.js'
import type { RawArticle, DetectedTopic } from '@/lib/topic-detector.js'

const mockSportsRepo = vi.mocked(sportsRepository)
const mockTopicsRepo = vi.mocked(newsTopicsRepository)
const mockScraper = vi.mocked(newsScraperService)
const mockDetect = vi.mocked(detectHotTopics)
const mockEnqueue = vi.mocked(enqueueArticleGeneration)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSport(slug: string): Sport {
  return {
    id: `00000000-0000-0000-0000-00000000000${slug.length}`,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    slug,
    created_at: new Date(),
  }
}

function makeRawArticle(overrides: Partial<RawArticle> = {}): RawArticle {
  return {
    title: 'Test article',
    content: 'Content here',
    source: 'BBC Sport',
    url: 'https://example.com/1',
    publishedAt: new Date(),
    ...overrides,
  }
}

function makeDetectedTopic(overrides: Partial<DetectedTopic> = {}): DetectedTopic {
  return {
    entities: ['Mbappé', 'PSG'],
    keywords: ['transfert'],
    headline: 'Mbappé prolonge au PSG',
    sources: [makeRawArticle({ source: 'BBC' }), makeRawArticle({ source: 'RMC' })],
    sourcesCount: 2,
    score: 8,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runNewsDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTopicsRepo.findRecentByEntities.mockResolvedValue(null)
    mockTopicsRepo.create.mockResolvedValue({
      id: 'topic-uuid-1',
      sport_id: 'sport-id',
      entities: ['Mbappé', 'PSG'],
      keywords: ['transfert'],
      headline: 'Mbappé prolonge au PSG',
      sources_count: 2,
      score: 8,
      raw_excerpts: [],
      article_id: null,
      first_seen_at: new Date(),
      created_at: new Date(),
    })
  })

  it('processes all sports sequentially and enqueues topics', async () => {
    const sports = [makeSport('football'), makeSport('basketball')]
    mockSportsRepo.findAll.mockResolvedValue(sports)

    const topic = makeDetectedTopic()
    mockScraper.getLatestNewsBySport.mockResolvedValue([makeRawArticle()])
    mockDetect.mockReturnValue([topic])

    const result = await runNewsDigest()

    expect(mockScraper.getLatestNewsBySport).toHaveBeenCalledTimes(2)
    expect(mockScraper.getLatestNewsBySport).toHaveBeenCalledWith('football')
    expect(mockScraper.getLatestNewsBySport).toHaveBeenCalledWith('basketball')
    expect(mockEnqueue).toHaveBeenCalledTimes(2) // 1 topic per sport
    expect(result.sports).toBe(2)
    expect(result.total).toBe(2)
  })

  it('skips duplicate topics when findRecentByEntities returns a match', async () => {
    mockSportsRepo.findAll.mockResolvedValue([makeSport('football')])
    mockScraper.getLatestNewsBySport.mockResolvedValue([makeRawArticle()])
    mockDetect.mockReturnValue([makeDetectedTopic()])

    // Simulate existing duplicate topic
    mockTopicsRepo.findRecentByEntities.mockResolvedValue({
      id: 'existing-topic',
      sport_id: 'sport-id',
      entities: ['Mbappé', 'PSG'],
      keywords: [],
      headline: 'Already covered',
      sources_count: 2,
      score: 7,
      raw_excerpts: [],
      article_id: null,
      first_seen_at: new Date(),
      created_at: new Date(),
    })

    const result = await runNewsDigest()

    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(result.total).toBe(0)
  })

  it('respects max 3 topics per sport per run', async () => {
    mockSportsRepo.findAll.mockResolvedValue([makeSport('football')])
    mockScraper.getLatestNewsBySport.mockResolvedValue([makeRawArticle()])

    // Return 5 topics, should only process 3
    const topics = Array.from({ length: 5 }, (_, i) =>
      makeDetectedTopic({
        entities: [`Entity${i}`, `Club${i}`],
        headline: `Topic ${i}`,
      }),
    )
    mockDetect.mockReturnValue(topics)

    const result = await runNewsDigest()

    expect(mockTopicsRepo.create).toHaveBeenCalledTimes(3)
    expect(mockEnqueue).toHaveBeenCalledTimes(3)
    expect(result.total).toBe(3)
  })

  it('is crash-safe: continues when newsScraperService throws for one sport', async () => {
    const sports = [makeSport('football'), makeSport('basketball')]
    mockSportsRepo.findAll.mockResolvedValue(sports)

    mockScraper.getLatestNewsBySport
      .mockRejectedValueOnce(new Error('RSS timeout')) // football fails
      .mockResolvedValueOnce([makeRawArticle()]) // basketball works

    mockDetect.mockReturnValue([makeDetectedTopic()])

    // Should not throw
    const result = await runNewsDigest()

    // Basketball still processed
    expect(mockScraper.getLatestNewsBySport).toHaveBeenCalledTimes(2)
    expect(result.sports).toBe(2)
  })

  it('returns 0 when no sports have hot topics', async () => {
    mockSportsRepo.findAll.mockResolvedValue([makeSport('football')])
    mockScraper.getLatestNewsBySport.mockResolvedValue([makeRawArticle()])
    mockDetect.mockReturnValue([]) // no hot topics detected

    const result = await runNewsDigest()

    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(result.total).toBe(0)
  })
})
