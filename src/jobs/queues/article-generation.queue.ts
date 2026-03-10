import { Queue } from 'bullmq'
import { env } from '@/config/env.js'
import { createChildLogger } from '@/lib/logger.js'

const log = createChildLogger('article-generation-queue')

export type ArticleGenerationJobData = {
  articleId?: string // set after article record is created (in worker)
  topicId: string // primary driver — news topic
  sportId: string
  language: 'fr' | 'en'
  tone: 'neutral' | 'analytical' | 'enthusiastic'
}

// Parse Redis URL into BullMQ connection options to avoid ioredis version conflicts
function redisConnectionOptions() {
  const url = new URL(env.REDIS_URL)
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.password ? { password: url.password } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
}

export const articleGenerationQueue = new Queue<ArticleGenerationJobData, void, string>(
  'article-generation',
  {
    connection: redisConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  },
)

export async function enqueueArticleGeneration(data: ArticleGenerationJobData): Promise<void> {
  const job = await articleGenerationQueue.add('generate', data)
  log.info(
    { jobId: job.id, topicId: data.topicId, sportId: data.sportId },
    'Article generation job enqueued',
  )
}
