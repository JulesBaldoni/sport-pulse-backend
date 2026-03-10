import { type Worker } from 'bullmq'
import { createArticleGenerationWorker } from './workers/article-generation.worker.js'
import { startNewsDigestScheduler } from './schedulers/news-digest.scheduler.js'
import { createChildLogger } from '@/lib/logger.js'

const log = createChildLogger('jobs')

let worker: Worker | null = null

export function startJobs(): void {
  worker = createArticleGenerationWorker()
  startNewsDigestScheduler()
  log.info('Jobs started: article generation worker + news digest scheduler (every 4h)')
}

export async function stopJobs(): Promise<void> {
  if (worker) {
    await worker.close()
    log.info('Article generation worker closed')
    worker = null
  }
}
