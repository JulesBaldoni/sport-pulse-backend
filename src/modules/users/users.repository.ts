import { eq, sql } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { users } from '@/db/schema/index.js';
import { NotFoundError } from '@/lib/errors.js';
import type { User, NewUser, UpdatePreferencesInput } from './users.types.js';

export const usersRepository = {
  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  },

  async create(data: NewUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0]!;
  },

  async updatePreferences(
    id: string,
    data: UpdatePreferencesInput,
  ): Promise<User> {
    const updateData: Partial<typeof users.$inferInsert> = {
      updated_at: new Date(),
    };

    if (data.preferred_sports !== undefined) {
      updateData.preferred_sports = data.preferred_sports;
    }
    if (data.preferred_language !== undefined) {
      updateData.preferred_language = data.preferred_language;
    }

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError(`User ${id} not found`);
    }
    return result[0]!;
  },
};

