import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { events, articles } from '@/db/schema/index.js';
import { decodeCursor } from '@/lib/pagination.js';
import type {
  Event,
  NewEvent,
  ListEventsParams,
  EventWithRelations,
} from './events.types.js';

export const eventsRepository = {
  async findMany(params: ListEventsParams): Promise<Event[]> {
    const conditions = [];

    if (params.sport_id) {
      conditions.push(eq(events.sport_id, params.sport_id));
    }
    if (params.status) {
      conditions.push(eq(events.status, params.status));
    }
    if (params.cursor) {
      const decodedId = decodeCursor(params.cursor);
      // Paginate by created_at: fetch rows created before the cursor row
      conditions.push(
        lt(
          events.created_at,
          sql`(SELECT created_at FROM events WHERE id = ${decodedId})`,
        ),
      );
    }

    return db
      .select()
      .from(events)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(events.created_at))
      .limit(params.limit + 1);
  },

  async findById(id: string): Promise<EventWithRelations | null> {
    const result = await db.query.events.findFirst({
      where: eq(events.id, id),
      with: {
        sport: true,
        homeTeam: true,
        awayTeam: true,
        article: true,
      },
    });
    return result ?? null;
  },

  async upsertByExternalId(data: NewEvent): Promise<Event> {
    const result = await db
      .insert(events)
      .values(data)
      .onConflictDoUpdate({
        target: events.external_id,
        set: {
          home_score: data.home_score,
          away_score: data.away_score,
          status: data.status,
          venue: data.venue,
        },
      })
      .returning();
    return result[0]!;
  },

  async findFinishedWithoutArticle(limit = 50): Promise<Event[]> {
    return db
      .select({ events })
      .from(events)
      .leftJoin(articles, eq(articles.event_id, events.id))
      .where(
        and(
          eq(events.status, 'finished'),
          isNull(articles.id),
        ),
      )
      .orderBy(desc(events.started_at))
      .limit(limit)
      .then((rows) => rows.map((r) => r.events));
  },
};

