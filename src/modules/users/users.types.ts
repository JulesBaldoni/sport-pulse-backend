import type { users } from '@/db/schema/index.js';
import type { z } from 'zod';
import type { updatePreferencesSchema } from './users.schema.js';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

