import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { articles } from '@/db/schema/index.js';
import { decodeCursor } from '@/lib/pagination.js';
import { NotFoundError } from '@/lib/errors.js';
import type {
  Article,
  NewArticle,
  ListArticlesParams,
  SearchArticlesParams,
  GeneratedArticleContent,
  ArticleWithRelations,
} from './articles.types.js';

export const articlesRepository = {
  async findMany(params: ListArticlesParams): Promise<Article[]> {
    const conditions = [
      eq(articles.status, 'published'),
      isNull(articles.deleted_at),
    ];

    if (params.sport_id) {
      conditions.push(eq(articles.sport_id, params.sport_id));
    }
    if (params.language) {
      conditions.push(eq(articles.language, params.language));
    }
    if (params.cursor) {
      const decodedId = decodeCursor(params.cursor);
      conditions.push(
        lt(
          articles.created_at,
          sql`(SELECT created_at FROM articles WHERE id = ${decodedId})`,
        ),
      );
    }

    return db
      .select()
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.created_at))
      .limit(params.limit + 1);
  },

  async search(params: SearchArticlesParams): Promise<Article[]> {
    const conditions = [
      eq(articles.status, 'published'),
      isNull(articles.deleted_at),
      sql`${articles.search_vector} @@ plainto_tsquery('french', ${params.q})`,
    ];

    if (params.sport_id) {
      conditions.push(eq(articles.sport_id, params.sport_id));
    }
    if (params.language) {
      conditions.push(eq(articles.language, params.language));
    }
    if (params.cursor) {
      const decodedId = decodeCursor(params.cursor);
      conditions.push(
        lt(
          articles.created_at,
          sql`(SELECT created_at FROM articles WHERE id = ${decodedId})`,
        ),
      );
    }

    return db
      .select()
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.created_at))
      .limit(params.limit + 1);
  },

  async findById(id: string): Promise<ArticleWithRelations | null> {
    const result = await db.query.articles.findFirst({
      where: and(eq(articles.id, id), isNull(articles.deleted_at)),
      with: {
        sport: true,
        event: {
          with: {
            sport: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
    });
    return result ?? null;
  },

  async findByEventId(eventId: string): Promise<Article | null> {
    const result = await db
      .select()
      .from(articles)
      .where(and(eq(articles.event_id, eventId), isNull(articles.deleted_at)))
      .limit(1);
    return result[0] ?? null;
  },

  async create(data: NewArticle): Promise<Article> {
    const result = await db.insert(articles).values(data).returning();
    return result[0]!;
  },

  async updateStatus(
    id: string,
    status: 'generating' | 'published' | 'failed',
  ): Promise<Article> {
    const result = await db
      .update(articles)
      .set({ status })
      .where(eq(articles.id, id))
      .returning();
    return result[0]!;
  },

  async updateContent(
    id: string,
    content: GeneratedArticleContent & { generated_at: Date },
  ): Promise<Article> {
    const result = await db
      .update(articles)
      .set({
        title: content.title,
        summary: content.summary,
        content: content.content,
        sources: content.sources,
        generated_at: content.generated_at,
        status: 'published',
      })
      .where(eq(articles.id, id))
      .returning();
    return result[0]!;
  },

  async softDelete(id: string): Promise<void> {
    const result = await db
      .update(articles)
      .set({ deleted_at: new Date() })
      .where(and(eq(articles.id, id), isNull(articles.deleted_at)))
      .returning({ id: articles.id });

    if (result.length === 0) {
      throw new NotFoundError(`Article ${id} not found`);
    }
  },
};

