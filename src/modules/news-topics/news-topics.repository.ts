import { and, desc, eq, gte, gt, sql } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { newsTopics } from '@/db/schema/index.js';
import { decodeCursor } from '@/lib/pagination.js';
import type { NewsTopic, NewNewsTopic } from '@/db/schema/index.js';

class NewsTopicsRepository {
  /**
   * Find a recent topic with overlapping entities (at least 2 in common)
   * within the given time window. Used for deduplication.
   */
  async findRecentByEntities(
    entities: string[],
    sportId: string,
    since: Date,
  ): Promise<NewsTopic | null> {
    if (entities.length === 0) return null;

    // Use PostgreSQL array overlap + manual overlap count via unnest
    // We check: array_length(array(SELECT unnest(entities) INTERSECT SELECT unnest($entities)), 1) >= 2
    const result = await db
      .select()
      .from(newsTopics)
      .where(
        and(
          eq(newsTopics.sport_id, sportId),
          gte(newsTopics.created_at, since),
          sql`(
            SELECT COUNT(*)
            FROM unnest(${newsTopics.entities}) AS e
            WHERE e = ANY(${sql`ARRAY[${sql.join(entities.map((e) => sql`${e}`), sql`, `)}]::text[]`})
          ) >= 2`,
        ),
      )
      .orderBy(desc(newsTopics.created_at))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewNewsTopic): Promise<NewsTopic> {
    const result = await db.insert(newsTopics).values(data).returning();
    return result[0]!;
  }

  async linkArticle(topicId: string, articleId: string): Promise<void> {
    await db
      .update(newsTopics)
      .set({ article_id: articleId })
      .where(eq(newsTopics.id, topicId));
  }

  async findById(id: string): Promise<NewsTopic | null> {
    const result = await db
      .select()
      .from(newsTopics)
      .where(eq(newsTopics.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findMany(params: {
    sportId?: string;
    cursor?: string;
    limit: number;
  }): Promise<NewsTopic[]> {
    const conditions = [];

    if (params.sportId) {
      conditions.push(eq(newsTopics.sport_id, params.sportId));
    }
    if (params.cursor) {
      const decodedId = decodeCursor(params.cursor);
      conditions.push(gt(newsTopics.id, decodedId));
    }

    return db
      .select()
      .from(newsTopics)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(newsTopics.created_at))
      .limit(params.limit + 1);
  }
}

export const newsTopicsRepository = new NewsTopicsRepository();

