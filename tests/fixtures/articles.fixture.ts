import type { Article, ArticleWithRelations } from '@/modules/articles/articles.types.js';
import { makeEventWithRelations } from './events.fixture.js';

const SPORT_ID = '00000000-0000-0000-0000-000000000010';
const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const ARTICLE_ID = '00000000-0000-0000-0000-000000000100';

export function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: ARTICLE_ID,
    event_id: EVENT_ID,
    sport_id: SPORT_ID,
    title: 'PSG domine le classique face à l\'OM',
    summary: 'Un match intense remporté par le PSG.',
    content: 'Le Paris Saint-Germain a dominé l\'Olympique de Marseille...',
    tone: 'neutral',
    language: 'fr',
    status: 'published',
    sources: ['https://example.com/article-1'],
    generated_at: new Date('2026-03-02T00:00:00Z'),
    created_at: new Date('2026-03-02T00:00:00Z'),
    deleted_at: null,
    search_vector: null,
    ...overrides,
  };
}

export function makeArticleWithRelations(
  overrides: Partial<ArticleWithRelations> = {},
): ArticleWithRelations {
  const base = makeArticle(overrides);
  return {
    ...base,
    sport: {
      id: SPORT_ID,
      name: 'Football',
      slug: 'football',
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
    event: makeEventWithRelations({ id: EVENT_ID }),
    ...overrides,
  };
}

