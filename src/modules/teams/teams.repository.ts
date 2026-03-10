import { eq } from 'drizzle-orm';
import { db } from '@/config/database.js';
import { teams } from '@/db/schema/index.js';
import type { Team, NewTeam } from './teams.types.js';

export const teamsRepository = {
  async upsertByExternalId(data: NewTeam & { sport_id: string }): Promise<Team> {
    const result = await db
      .insert(teams)
      .values(data)
      .onConflictDoUpdate({
        target: teams.external_id,
        set: {
          name: data.name,
          short_name: data.short_name,
          logo_url: data.logo_url,
        },
      })
      .returning();
    return result[0]!;
  },
};

