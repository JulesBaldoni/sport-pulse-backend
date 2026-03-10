import { describe, it, expect } from 'vitest';
import './setup.js';
import { GET, POST, DELETE, seed, authHeaders } from './helpers.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaginatedBody<T> {
  success: boolean;
  data: {
    data: T[];
    meta: { hasMore: boolean; nextCursor: string | null; count: number };
  };
}

interface ArticleBody {
  id: string;
  sport_id: string;
  event_id?: string | null;
  status: string;
  language: string;
  title: string;
  sport?: { slug: string };
}

interface ErrorBody {
  success: false;
  error: { code: string; message: string };
}

const enabled = process.env['SERVICES_AVAILABLE'] === 'true';

// ─── GET /api/articles ────────────────────────────────────────────────────────

describe.runIf(enabled)('GET /api/articles', () => {
  it('returns empty list when no published articles', async () => {
    const sport = await seed.sport({ slug: 'football' });
    await seed.article({ sport_id: sport.id, status: 'pending' });

    const res = await GET('/api/articles');
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.data).toHaveLength(0);
  });

  it('returns only published non-deleted articles', async () => {
    const sport = await seed.sport({ slug: 'football' });
    await seed.article({ sport_id: sport.id, status: 'published' });
    await seed.article({ sport_id: sport.id, status: 'published', deleted_at: new Date() });
    await seed.article({ sport_id: sport.id, status: 'failed' });
    await seed.article({ sport_id: sport.id, status: 'generating' });

    const res = await GET('/api/articles');
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.data).toHaveLength(1);
    expect(body.data.data[0]!.status).toBe('published');
  });

  it('filters by language', async () => {
    const sport = await seed.sport({ slug: 'football' });
    await seed.article({ sport_id: sport.id, status: 'published', language: 'fr' });
    await seed.article({ sport_id: sport.id, status: 'published', language: 'en' });

    const res = await GET('/api/articles?language=fr');
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.data).toHaveLength(1);
    expect(body.data.data[0]!.language).toBe('fr');
  });

  it('filters by sport_id', async () => {
    const football = await seed.sport({ slug: 'football' });
    const basketball = await seed.sport({ slug: 'basketball' });
    await seed.article({ sport_id: football.id, status: 'published' });
    await seed.article({ sport_id: basketball.id, status: 'published' });

    const res = await GET(`/api/articles?sport_id=${football.id}`);
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.data).toHaveLength(1);
  });

  it('paginates correctly', async () => {
    const sport = await seed.sport({ slug: 'football' });
    for (let i = 0; i < 7; i++) {
      await seed.article({ sport_id: sport.id, status: 'published' });
    }

    const page1res = await GET('/api/articles?limit=4');
    const body1 = await page1res.json() as PaginatedBody<ArticleBody>;
    expect(body1.data.data).toHaveLength(4);
    expect(body1.data.meta.hasMore).toBe(true);
    expect(body1.data.meta.nextCursor).toBeTruthy();

    const page2res = await GET(`/api/articles?limit=4&cursor=${body1.data.meta.nextCursor}`);
    const body2 = await page2res.json() as PaginatedBody<ArticleBody>;
    // Page 2 has the remaining articles (3 out of 7)
    expect(body2.data.data.length).toBeGreaterThan(0);
    expect(body2.data.meta.hasMore).toBe(false);

    // No overlap between pages
    const ids1 = body1.data.data.map((a) => a.id);
    const ids2 = body2.data.data.map((a) => a.id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    // Total items across both pages = 7
    expect(ids1.length + ids2.length).toBe(7);
  });

  it('returns correct pagination meta', async () => {
    const sport = await seed.sport({ slug: 'football' });
    await seed.article({ sport_id: sport.id, status: 'published' });

    const res = await GET('/api/articles');
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.meta).toMatchObject({
      hasMore: false,
      nextCursor: null,
      count: 1,
    });
  });
});

// ─── GET /api/articles/search ─────────────────────────────────────────────────

describe.runIf(enabled)('GET /api/articles/search', () => {
  it('returns 400 when q is missing', async () => {
    const res = await GET('/api/articles/search');
    expect(res.status).toBe(400);
  });

  it('returns 400 when q is too short (< 2 chars)', async () => {
    const res = await GET('/api/articles/search?q=a');
    expect(res.status).toBe(400);
    const body = await res.json() as ErrorBody;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns matching articles via full-text search', async () => {
    const sport = await seed.sport({ slug: 'football' });
    await seed.article({
      sport_id: sport.id,
      status: 'published',
      title: 'Mbappé rejoint le Real Madrid',
      content: 'Le transfert de la décennie vient de se confirmer officiellement par les deux clubs.',
    });
    await seed.article({
      sport_id: sport.id,
      status: 'published',
      title: 'Résultats de Ligue 1',
      content: 'Journée ordinaire en championnat sans grands événements marquants.',
    });

    const res = await GET('/api/articles/search?q=Mbappé');
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.data).toHaveLength(1);
    expect(body.data.data[0]!.title).toContain('Mbappé');
  });

  it('does not return deleted or non-published articles', async () => {
    const sport = await seed.sport({ slug: 'football' });
    await seed.article({
      sport_id: sport.id,
      status: 'published',
      deleted_at: new Date(),
      title: 'Mbappé article deleted',
      content: 'Contenu supprimé définitivement du système.',
    });

    const res = await GET('/api/articles/search?q=Mbappé');
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.data).toHaveLength(0);
  });

  it('returns 200 with empty list when no match', async () => {
    const sport = await seed.sport({ slug: 'football' });
    await seed.article({ sport_id: sport.id, status: 'published', title: 'Foot' });

    const res = await GET('/api/articles/search?q=Tennis');
    expect(res.status).toBe(200);
    const body = await res.json() as PaginatedBody<ArticleBody>;
    expect(body.data.data).toHaveLength(0);
  });
});

// ─── GET /api/articles/:id ────────────────────────────────────────────────────

describe.runIf(enabled)('GET /api/articles/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await GET('/api/articles/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    const body = await res.json() as ErrorBody;
    expect(body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('returns article with sport relation', async () => {
    const sport = await seed.sport({ slug: 'football' });
    const article = await seed.article({ sport_id: sport.id, status: 'published' });

    const res = await GET(`/api/articles/${article.id}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: ArticleBody };
    expect(body.data).toMatchObject({
      id: article.id,
      sport: { slug: 'football' },
    });
  });

  it('returns 404 for soft-deleted article', async () => {
    const sport = await seed.sport({ slug: 'football' });
    const article = await seed.article({
      sport_id: sport.id,
      status: 'published',
      deleted_at: new Date(),
    });

    const res = await GET(`/api/articles/${article.id}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/articles/generate ─────────────────────────────────────────────

describe.runIf(enabled)('POST /api/articles/generate', () => {
  it('returns 401 without x-user-id header', async () => {
    const res = await POST('/api/articles/generate', { event_id: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid event_id format', async () => {
    const res = await POST(
      '/api/articles/generate',
      { event_id: 'not-a-uuid' },
      await authHeaders(),
    );
    expect(res.status).toBe(400);
    const body = await res.json() as ErrorBody;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when event does not exist', async () => {
    const res = await POST(
      '/api/articles/generate',
      { event_id: '00000000-0000-0000-0000-000000000000' },
      await authHeaders(),
    );
    expect(res.status).toBe(404);
  });

  it('returns 409 when article already exists for this event', async () => {
    const sport = await seed.sport({ slug: 'football' });
    const team = await seed.team({ sport_id: sport.id });
    const event = await seed.event({ sport_id: sport.id, home_team_id: team.id, away_team_id: team.id });
    await seed.article({ sport_id: sport.id, event_id: event.id, status: 'published' });

    const res = await POST(
      '/api/articles/generate',
      { event_id: event.id },
      await authHeaders(),
    );
    expect(res.status).toBe(409);
    const body = await res.json() as ErrorBody;
    expect(body.error.code).toBe('CONFLICT');
  });

  it('returns 202 and creates pending article when event exists', async () => {
    const sport = await seed.sport({ slug: 'football' });
    const team = await seed.team({ sport_id: sport.id });
    const event = await seed.event({
      sport_id: sport.id,
      home_team_id: team.id,
      away_team_id: team.id,
      status: 'finished',
    });

    const res = await POST(
      '/api/articles/generate',
      { event_id: event.id, language: 'fr', tone: 'neutral' },
      await authHeaders(),
    );
    expect(res.status).toBe(202);
    const body = await res.json() as { success: boolean; data: ArticleBody };
    expect(body.data).toMatchObject({
      status: 'pending',
      event_id: event.id,
    });
  });
});

// ─── DELETE /api/articles/:id ─────────────────────────────────────────────────

describe.runIf(enabled)('DELETE /api/articles/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await DELETE('/api/articles/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown article', async () => {
    const res = await DELETE(
      '/api/articles/00000000-0000-0000-0000-000000000000',
      await authHeaders(),
    );
    expect(res.status).toBe(404);
  });

  it('soft deletes article — subsequent GET returns 404', async () => {
    const sport = await seed.sport({ slug: 'football' });
    const article = await seed.article({ sport_id: sport.id, status: 'published' });

    const deleteRes = await DELETE(`/api/articles/${article.id}`, await authHeaders());
    expect(deleteRes.status).toBe(200);

    const getRes = await GET(`/api/articles/${article.id}`);
    expect(getRes.status).toBe(404);
  });
});



