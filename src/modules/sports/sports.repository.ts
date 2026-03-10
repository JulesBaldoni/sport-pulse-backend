import { asc, eq } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { sports } from '@/db/schema/index.js';
import type { Sport } from './sports.types.js';

export const sportsRepository = {
  async findAll(): Promise<Sport[]> {
    return db.select().from(sports).orderBy(asc(sports.name));
  },

  async findBySlug(slug: string): Promise<Sport | null> {
    const result = await db
      .select()
      .from(sports)
      .where(eq(sports.slug, slug))
      .limit(1);
    return result[0] ?? null;
  },
};

