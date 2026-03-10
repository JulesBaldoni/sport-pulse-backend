import { z } from 'zod'

export const updatePreferencesSchema = z.object({
  preferred_sports: z.array(z.string()).optional(),
  preferred_language: z.enum(['fr', 'en']).optional(),
})
