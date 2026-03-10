import { describe, it, expect } from 'vitest';
import {
  extractEntities,
  extractKeywords,
  groupIntoTopics,
  scoreTopic,
  detectHotTopics,
} from '@/lib/topic-detector.js';
import type { RawArticle, DetectedTopic } from '@/lib/topic-detector.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeArticle(overrides: Partial<RawArticle> = {}): RawArticle {
  return {
    title: 'Generic sports news',
    content: 'Some sports content here.',
    source: 'BBC Sport',
    url: 'https://example.com/article',
    publishedAt: new Date(),
    ...overrides,
  };
}

function makeTopic(overrides: Partial<DetectedTopic> = {}): DetectedTopic {
  return {
    entities: ['Mbappé', 'PSG'],
    keywords: ['transfert', 'contrat'],
    headline: 'Mbappé prolonge au PSG',
    sources: [
      makeArticle({ source: 'L\'Equipe' }),
      makeArticle({ source: 'RMC Sport' }),
    ],
    sourcesCount: 2,
    score: 0,
    ...overrides,
  };
}

// ─── extractEntities ─────────────────────────────────────────────────────────

describe('extractEntities', () => {
  it('extracts capitalized words that are not stop words', () => {
    const titles = ['Mbappé rejoint le Real Madrid'];
    const result = extractEntities(titles);
    expect(result).toContain('Mbappé');
    expect(result).toContain('Madrid');
    expect(result).not.toContain('le');
    expect(result).not.toContain('Le');
  });

  it('filters out FR stop words', () => {
    const titles = ['Le PSG et Les Bleus jouent Pour La victoire'];
    const result = extractEntities(titles);
    expect(result).not.toContain('Le');
    expect(result).not.toContain('Les');
    expect(result).not.toContain('Et');
    expect(result).not.toContain('Pour');
    expect(result).not.toContain('La');
    expect(result).toContain('PSG');
    expect(result).toContain('Bleus');
  });

  it('filters out EN stop words', () => {
    const titles = ['The Champions League Final Is At Wembley'];
    const result = extractEntities(titles);
    expect(result).not.toContain('The');
    expect(result).not.toContain('Is');
    expect(result).not.toContain('At');
    expect(result).toContain('Champions');
    expect(result).toContain('League');
    expect(result).toContain('Final');
    expect(result).toContain('Wembley');
  });

  it('returns at most 5 entities', () => {
    const titles = ['Alpha Beta Gamma Delta Epsilon Zeta Eta'];
    const result = extractEntities(titles);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('deduplicates entities across multiple titles', () => {
    const titles = ['Mbappé signe', 'Mbappé rejoint Madrid', 'Mbappé quitte PSG'];
    const result = extractEntities(titles);
    const mbappeOccurrences = result.filter((e) => e === 'Mbappé').length;
    expect(mbappeOccurrences).toBe(1);
  });

  it('sorts by frequency descending', () => {
    const titles = ['Mbappé signe', 'Madrid attend', 'Mbappé à Madrid', 'Mbappé confirme'];
    const result = extractEntities(titles);
    // Mbappé appears 3x, Madrid 2x
    expect(result[0]).toBe('Mbappé');
    expect(result[1]).toBe('Madrid');
  });
});

// ─── extractKeywords ─────────────────────────────────────────────────────────

describe('extractKeywords', () => {
  it('returns top keywords by frequency', () => {
    const texts = [
      'transfert contrat joueur foot transfert mercato',
      'contrat joueur transfert extension',
    ];
    const result = extractKeywords(texts);
    expect(result).toContain('transfert');
    expect(result).toContain('contrat');
  });

  it('excludes words shorter than 4 chars', () => {
    const texts = ['le but est un gros transfert en cup'];
    const result = extractKeywords(texts);
    result.forEach((k) => expect(k.length).toBeGreaterThanOrEqual(4));
  });

  it('returns at most 10 keywords', () => {
    const texts = Array.from({ length: 20 }, (_, i) => `word${i} transfert contrat joueur`);
    const result = extractKeywords(texts);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

// ─── groupIntoTopics ─────────────────────────────────────────────────────────

describe('groupIntoTopics', () => {
  it('groups two articles sharing an entity into the same topic', () => {
    const articles = [
      makeArticle({ title: 'Mbappé prolonge au PSG', url: 'https://example.com/1' }),
      makeArticle({ title: 'Mbappé signe un nouveau contrat', url: 'https://example.com/2' }),
    ];
    const topics = groupIntoTopics(articles);
    expect(topics).toHaveLength(1);
    expect(topics[0]!.sources).toHaveLength(2);
  });

  it('merges transitively: A+B share PSG, B+C share Mbappé → all three in same group', () => {
    const articles = [
      makeArticle({ title: 'PSG annonce bilan financier', url: 'https://example.com/1' }),
      makeArticle({ title: 'Mbappé PSG contrat signé', url: 'https://example.com/2' }),
      makeArticle({ title: 'Mbappé réagit aux rumeurs', url: 'https://example.com/3' }),
    ];
    const topics = groupIntoTopics(articles);
    expect(topics).toHaveLength(1);
    expect(topics[0]!.sources).toHaveLength(3);
  });

  it('creates singleton group for article with no entities', () => {
    const articles = [
      makeArticle({ title: 'les résultats du week-end en sport', url: 'https://example.com/1' }),
    ];
    const topics = groupIntoTopics(articles);
    expect(topics).toHaveLength(1);
    expect(topics[0]!.sources).toHaveLength(1);
  });

  it('creates separate groups for unrelated articles', () => {
    const articles = [
      makeArticle({ title: 'Mbappé prolonge au PSG', url: 'https://example.com/1' }),
      makeArticle({ title: 'Nadal annonce sa retraite du tennis', url: 'https://example.com/2' }),
    ];
    const topics = groupIntoTopics(articles);
    expect(topics).toHaveLength(2);
  });
});

// ─── scoreTopic ───────────────────────────────────────────────────────────────

describe('scoreTopic', () => {
  it('adds 2 points per distinct source', () => {
    const topic = makeTopic({ sourcesCount: 3 });
    const score = scoreTopic(topic, new Date());
    expect(score).toBeGreaterThanOrEqual(6);
  });

  it('adds 2 points for 2+ entities', () => {
    const baseEntities = makeTopic({ entities: ['Mbappé', 'PSG'], sourcesCount: 1 });
    const singleEntity = makeTopic({ entities: ['Mbappé'], sourcesCount: 1 });

    const scoreMulti = scoreTopic(baseEntities, new Date());
    const scoreSingle = scoreTopic(singleEntity, new Date());

    expect(scoreMulti).toBeGreaterThan(scoreSingle);
  });

  it('applies penalty for single source', () => {
    const singleSource = makeTopic({
      sources: [makeArticle({ source: 'BBC Sport' })],
      sourcesCount: 1,
      entities: [],
    });
    const score = scoreTopic(singleSource, new Date());
    // 1*2 = 2 for sources, -3 penalty = -1
    expect(score).toBeLessThan(2);
  });

  it('adds bonus for articles published less than 1 hour ago', () => {
    const now = new Date();
    const recentArticle = makeArticle({
      source: 'Source A',
      publishedAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
    });
    const oldArticle = makeArticle({
      source: 'Source B',
      publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
    });

    const topicWithRecent = makeTopic({ sources: [recentArticle, oldArticle], sourcesCount: 2 });
    const topicWithoutRecent = makeTopic({ sources: [oldArticle, oldArticle], sourcesCount: 2 });

    const scoreWithRecent = scoreTopic(topicWithRecent, now);
    const scoreWithout = scoreTopic(topicWithoutRecent, now);

    expect(scoreWithRecent).toBeGreaterThan(scoreWithout);
  });
});

// ─── detectHotTopics ─────────────────────────────────────────────────────────

describe('detectHotTopics', () => {
  it('returns only topics with score >= 3', () => {
    // Single source with no recent articles → likely score < 3
    const articles = [
      makeArticle({
        title: 'Generic news without named entities',
        source: 'RSS',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8h ago
        url: 'https://example.com/old',
      }),
    ];
    const topics = detectHotTopics(articles);
    topics.forEach((t) => expect(t.score).toBeGreaterThanOrEqual(3));
  });

  it('returns at most 10 topics', () => {
    // Create 15 distinct topics
    const articles = Array.from({ length: 15 }, (_, i) => [
      makeArticle({
        title: `Entity${i}Alpha wins championship`,
        source: `Source A ${i}`,
        url: `https://example.com/${i}a`,
        publishedAt: new Date(),
      }),
      makeArticle({
        title: `Entity${i}Alpha signs contract`,
        source: `Source B ${i}`,
        url: `https://example.com/${i}b`,
        publishedAt: new Date(),
      }),
    ]).flat();

    const topics = detectHotTopics(articles);
    expect(topics.length).toBeLessThanOrEqual(10);
  });

  it('sorts by score DESC', () => {
    const now = new Date();
    const articles = [
      // High score: 3 sources + recent
      makeArticle({ title: 'Mbappé signs deal', source: 'BBC', url: 'u1', publishedAt: new Date(now.getTime() - 10 * 60 * 1000) }),
      makeArticle({ title: 'Mbappé new contract confirmed', source: 'RMC', url: 'u2', publishedAt: new Date(now.getTime() - 20 * 60 * 1000) }),
      makeArticle({ title: 'Mbappé deal done', source: "L'Equipe", url: 'u3', publishedAt: new Date(now.getTime() - 30 * 60 * 1000) }),
      // Lower score: 2 sources, older
      makeArticle({ title: 'Ronaldo scores again', source: 'Sky', url: 'u4', publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) }),
      makeArticle({ title: 'Ronaldo hat-trick', source: 'ESPN', url: 'u5', publishedAt: new Date(now.getTime() - 3.5 * 60 * 60 * 1000) }),
    ];
    const topics = detectHotTopics(articles, now);
    for (let i = 1; i < topics.length; i++) {
      expect(topics[i - 1]!.score).toBeGreaterThanOrEqual(topics[i]!.score);
    }
  });
});

