import cron from 'node-cron';
import { createChildLogger } from '@/lib/logger.js';
import { sportsRepository } from '@/modules/sports/sports.repository.js';
import { newsTopicsRepository } from '@/modules/news-topics/news-topics.repository.js';
import { newsScraperService } from '@/integrations/news-scraper/news-scraper.service.js';
import { detectHotTopics, MAX_TOPICS_PER_SPORT } from '@/lib/topic-detector.js';
import { enqueueArticleGeneration } from '@/jobs/queues/article-generation.queue.js';

const log = createChildLogger('news-digest-scheduler');

const DEDUP_WINDOW_HOURS = 24;

export async function runNewsDigest(): Promise<{ total: number; sports: number }> {
  const now = new Date();
  log.info({ timestamp: now.toISOString() }, 'Starting news digest');

  const sports = await sportsRepository.findAll();
  let totalQueued = 0;

  for (const sport of sports) {
    try {
      // a. Fetch latest news for this sport
      const rawArticles = await newsScraperService.getLatestNewsBySport(sport.slug);
      log.info({ sport: sport.name, count: rawArticles.length }, `Fetched raw articles for ${sport.name}`);

      if (rawArticles.length === 0) continue;

      // b. Detect hot topics
      const hotTopics = detectHotTopics(rawArticles, now);
      log.info({ sport: sport.name, count: hotTopics.length }, `Detected hot topics for ${sport.name} (score >= 3)`);

      // c. Process up to MAX_TOPICS_PER_SPORT per sport
      const toProcess = hotTopics.slice(0, MAX_TOPICS_PER_SPORT);
      const since = new Date(now.getTime() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);

      for (const topic of toProcess) {
        // Deduplication check
        const existing = await newsTopicsRepository.findRecentByEntities(
          topic.entities,
          sport.id,
          since,
        );

        if (existing) {
          log.debug(
            { entities: topic.entities, existingId: existing.id },
            `Skipping duplicate topic: ${topic.entities.join(', ')}`,
          );
          continue;
        }

        // Create topic in DB
        const newTopic = await newsTopicsRepository.create({
          sport_id: sport.id,
          entities: topic.entities,
          keywords: topic.keywords,
          headline: topic.headline,
          sources_count: topic.sourcesCount,
          score: topic.score,
          raw_excerpts: topic.sources as unknown as Record<string, unknown>[],
        });

        // Enqueue generation job
        await enqueueArticleGeneration({
          topicId: newTopic.id,
          sportId: sport.id,
          language: 'fr',
          tone: 'neutral',
        });

        log.info(
          { topicId: newTopic.id, headline: topic.headline, score: topic.score },
          `Queued article for topic: ${topic.headline} (score: ${topic.score})`,
        );

        totalQueued++;
      }
    } catch (err) {
      log.error({ sport: sport.name, err }, `Error processing sport ${sport.name} in digest`);
      // Never crash — continue with next sport
    }
  }

  log.info(
    { total: totalQueued, sports: sports.length },
    `News digest complete: ${totalQueued} topics queued across ${sports.length} sports`,
  );

  return { total: totalQueued, sports: sports.length };
}

export function startNewsDigestScheduler(): void {
  // Every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    try {
      await runNewsDigest();
    } catch (err) {
      log.error({ err }, 'News digest cron job failed unexpectedly');
    }
  });

  log.info('News digest scheduler started (every 4h: 0 */4 * * *)');
}

