import { Worker, type Job } from 'bullmq'
import { env } from '@/config/env.js'
import { createChildLogger } from '@/lib/logger.js'
import { JobError } from '@/lib/errors.js'
import { articlesRepository } from '@/modules/articles/articles.repository.js'
import { newsTopicsRepository } from '@/modules/news-topics/news-topics.repository.js'
import { mistralClient } from '@/integrations/mistral/mistral.client.js'
import {
  buildTopicSystemPrompt,
  buildTopicUserPrompt,
  parseArticleResponse,
} from '@/integrations/mistral/prompts/article-generation.prompt.js'
import type { ArticleGenerationJobData } from '@/jobs/queues/article-generation.queue.js'
import type { RawArticle } from '@/lib/topic-detector.js'

const log = createChildLogger('article-generation-worker')

export async function processArticleGenerationJob(
  job: Job<ArticleGenerationJobData>,
): Promise<void> {
  const { topicId, sportId, language, tone } = job.data

  // Step 1 — Fetch topic from DB
  const topic = await newsTopicsRepository.findById(topicId)
  if (!topic) {
    throw new JobError(`Topic ${topicId} not found`)
  }

  log.info({ jobId: job.id, topicId, headline: topic.headline }, 'Starting article generation')

  // Step 2 — Create article record as 'generating'
  const article = await articlesRepository.create({
    sport_id: sportId,
    event_id: null,
    title: topic.headline,
    content: '',
    status: 'generating',
    language,
    tone,
    sources: [],
  })

  // Step 3 — Build prompt
  const excerpts = (topic.raw_excerpts as RawArticle[]).map((e) => ({
    title: e.title,
    content: e.content,
    source: e.source,
    url: e.url,
  }))

  const systemPrompt = buildTopicSystemPrompt(language)
  const userPrompt = buildTopicUserPrompt({
    headline: topic.headline,
    entities: topic.entities,
    keywords: topic.keywords,
    excerpts,
    language,
    tone,
  })

  // Step 4 — Call Mistral
  const rawResponse = await mistralClient.complete(systemPrompt, userPrompt)
  const generatedContent = parseArticleResponse(rawResponse)

  // Step 5 — Save article + link to topic
  await articlesRepository.updateContent(article.id, {
    ...generatedContent,
    generated_at: new Date(),
  })
  await articlesRepository.updateStatus(article.id, 'published')
  await newsTopicsRepository.linkArticle(topicId, article.id)

  const wordCount = generatedContent.content.split(/\s+/).length
  log.info(
    {
      articleId: article.id,
      topicId,
      title: generatedContent.title,
      entities: topic.entities,
      score: topic.score,
      wordCount,
    },
    `Article published: ${generatedContent.title} | topic: ${topic.entities.join(', ')} | score: ${topic.score}`,
  )
}

export function createArticleGenerationWorker(): Worker<ArticleGenerationJobData> {
  const url = new URL(env.REDIS_URL)
  const connection = {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.password ? { password: url.password } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }

  const worker = new Worker<ArticleGenerationJobData>(
    'article-generation',
    async (job: Job<ArticleGenerationJobData>) => {
      const { topicId } = job.data
      try {
        await processArticleGenerationJob(job)
      } catch (err) {
        const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1

        log.error(
          { jobId: job.id, topicId, attempt: job.attemptsMade + 1, isLastAttempt, err },
          'Article generation job failed',
        )

        // Mark article as failed only on last attempt, if it was created
        if (isLastAttempt) {
          // Try to find and mark failed — best effort
          try {
            const topic = await newsTopicsRepository.findById(topicId)
            if (topic?.article_id) {
              await articlesRepository.updateStatus(topic.article_id, 'failed')
            }
          } catch {
            // ignore secondary error
          }
        }

        throw err
      }
    },
    { connection, concurrency: 3 },
  )

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Article generation job completed')
  })

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Article generation job failed permanently')
  })

  worker.on('error', (err) => {
    log.error({ err }, 'Article generation worker error')
  })

  return worker
}
