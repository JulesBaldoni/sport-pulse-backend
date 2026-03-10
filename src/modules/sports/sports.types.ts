import type { sports } from '@/db/schema/index.js'

export type Sport = typeof sports.$inferSelect
export type NewSport = typeof sports.$inferInsert
