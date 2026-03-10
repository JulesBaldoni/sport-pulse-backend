import type { articles, sports } from '@/db/schema/index.js'
import type { z } from 'zod'
import type {
  listArticlesSchema,
  searchArticlesSchema,
  generateArticleSchema,
} from './articles.schema.js'
import type { EventWithRelations } from '@/modules/events/events.types.js'

export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type ListArticlesParams = z.infer<typeof listArticlesSchema>
export type SearchArticlesParams = z.infer<typeof searchArticlesSchema>
export type GenerateArticleInput = z.infer<typeof generateArticleSchema>

export type ArticleSport = typeof sports.$inferSelect

export type ArticleWithRelations = Article & {
  sport: ArticleSport
  event?: EventWithRelations | null
}

export type GeneratedArticleContent = {
  title: string
  summary: string
  content: string
  sources: string[]
}
