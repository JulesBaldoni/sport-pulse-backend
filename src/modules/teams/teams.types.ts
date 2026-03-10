import type { teams } from '@/db/schema/index.js';

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

