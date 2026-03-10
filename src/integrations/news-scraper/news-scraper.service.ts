import { createChildLogger } from '@/lib/logger.js';
import { rssClient } from './rss.client.js';
import { guardianClient } from './guardian.client.js';
import type { RawArticle } from '@/lib/topic-detector.js';

const log = createChildLogger('news-scraper');

export type SearchQuery = {
  homeTeam: string;
  awayTeam: string;
  competition: string;
};

export type NewsExcerpt = {
  title: string;
  content: string;
  source: string;
  url: string;
};

const MAX_EXCERPTS = 5;
const MAX_LATEST = 40;

class NewsScraperService {
  async getExcerptsForMatch(query: SearchQuery): Promise<NewsExcerpt[]> {
    const searchString = `${query.homeTeam} ${query.awayTeam}`;
    const altString = `${query.homeTeam} ${query.competition}`;

    log.info({ searchString }, 'Fetching news excerpts for match');

    const [rssResult, guardianResult] = await Promise.allSettled([
      rssClient.fetchRecentArticles(searchString),
      guardianClient.search(`${searchString} OR ${altString}`),
    ]);

    const rssArticles = rssResult.status === 'fulfilled' ? rssResult.value : [];
    const guardianArticles = guardianResult.status === 'fulfilled' ? guardianResult.value : [];

    if (rssResult.status === 'rejected') {
      log.warn({ error: rssResult.reason }, 'RSS fetch failed in news scraper');
    }
    if (guardianResult.status === 'rejected') {
      log.warn({ error: guardianResult.reason }, 'Guardian fetch failed in news scraper');
    }

    const seen = new Set<string>();
    const merged: Array<NewsExcerpt & { publishedAt: Date }> = [];

    for (const article of [...rssArticles, ...guardianArticles]) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      merged.push({
        title: article.title,
        content: article.content,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt,
      });
    }

    merged.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    const excerpts = merged.slice(0, MAX_EXCERPTS).map(({ title, content, source, url }) => ({
      title,
      content,
      source,
      url,
    }));

    log.info({ count: excerpts.length }, 'News excerpts fetched');
    return excerpts;
  }

  async getLatestNewsBySport(sportSlug: string): Promise<RawArticle[]> {
    log.info({ sportSlug }, 'Fetching latest news by sport');

    const [rssResult, guardianResult] = await Promise.allSettled([
      rssClient.fetchLatestBySport(sportSlug),
      guardianClient.getLatestBySport(sportSlug),
    ]);

    const rssArticles = rssResult.status === 'fulfilled' ? rssResult.value : [];
    const guardianArticles = guardianResult.status === 'fulfilled' ? guardianResult.value : [];

    if (rssResult.status === 'rejected') {
      log.warn({ error: rssResult.reason }, 'RSS fetchLatestBySport failed');
    }
    if (guardianResult.status === 'rejected') {
      log.warn({ error: guardianResult.reason }, 'Guardian getLatestBySport failed');
    }

    const seen = new Set<string>();
    const merged: RawArticle[] = [];

    for (const article of [...rssArticles, ...guardianArticles]) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      merged.push({
        title: article.title,
        content: article.content,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt,
      });
    }

    merged.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    log.info({ sportSlug, count: merged.length }, 'Latest news fetched by sport');
    return merged.slice(0, MAX_LATEST);
  }
}

export const newsScraperService = new NewsScraperService();
