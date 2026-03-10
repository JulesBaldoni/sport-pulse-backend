import { env } from '@/config/env.js';
import { createChildLogger } from '@/lib/logger.js';
import { withRetry } from '@/lib/retry.js';

const log = createChildLogger('guardian-client');

export type GuardianArticle = {
  title: string;
  content: string;
  url: string;
  source: 'The Guardian';
  publishedAt: Date;
};

const MAX_CONTENT_LENGTH = 500;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const GUARDIAN_SPORT_TAGS: Record<string, string> = {
  football: 'football',
  basketball: 'sport/basketball',
  tennis: 'sport/tennis',
  rugby: 'sport/rugby-union',
};

type GuardianApiResult = {
  response: {
    results: Array<{
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      fields?: {
        headline?: string;
        bodyText?: string;
      };
    }>;
  };
};

class GuardianClient {
  private readonly baseUrl = 'https://content.guardianapis.com';

  private mapResults(results: GuardianApiResult['response']['results']): GuardianArticle[] {
    return results.map((item) => ({
      title: item.fields?.headline ?? item.webTitle,
      content: (item.fields?.bodyText ?? '').slice(0, MAX_CONTENT_LENGTH),
      url: item.webUrl,
      source: 'The Guardian' as const,
      publishedAt: new Date(item.webPublicationDate),
    }));
  }

  async search(query: string): Promise<GuardianArticle[]> {
    const params = new URLSearchParams({
      q: query,
      section: 'sport',
      'order-by': 'newest',
      'page-size': '5',
      'show-fields': 'bodyText,headline',
      'api-key': env.GUARDIAN_API_KEY ?? '',
    });

    const url = `${this.baseUrl}/search?${params.toString()}`;

    try {
      const data = await withRetry<GuardianApiResult>(
        async () => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} from Guardian API`);
          return res.json() as Promise<GuardianApiResult>;
        },
        2,
        1000,
      );
      return this.mapResults(data.response?.results ?? []);
    } catch (err) {
      log.warn({ query, error: err instanceof Error ? err.message : String(err) }, 'Guardian search failed');
      return [];
    }
  }

  async getLatestBySport(sportSlug: string): Promise<GuardianArticle[]> {
    const tag = GUARDIAN_SPORT_TAGS[sportSlug] ?? 'sport';
    const params = new URLSearchParams({
      section: 'sport',
      tag,
      'order-by': 'newest',
      'page-size': '10',
      'show-fields': 'bodyText,headline',
      'api-key': env.GUARDIAN_API_KEY ?? '',
    });

    const url = `${this.baseUrl}/search?${params.toString()}`;
    const cutoff = new Date(Date.now() - FOUR_HOURS_MS);

    try {
      const data = await withRetry<GuardianApiResult>(
        async () => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} from Guardian API`);
          return res.json() as Promise<GuardianApiResult>;
        },
        2,
        1000,
      );
      return this.mapResults(data.response?.results ?? []).filter(
        (a) => a.publishedAt >= cutoff,
      );
    } catch (err) {
      log.warn({ sportSlug, error: err instanceof Error ? err.message : String(err) }, 'Guardian getLatestBySport failed');
      return [];
    }
  }
}

export const guardianClient = new GuardianClient();
