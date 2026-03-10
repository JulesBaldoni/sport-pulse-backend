import { env } from '@/config/env.js';
import { createChildLogger } from '@/lib/logger.js';
import { ExternalServiceError } from '@/lib/errors.js';
import { withRetry } from '@/lib/retry.js';
import type { RawFixture } from './sports-api.mapper.js';

const log = createChildLogger('sports-api');

type ApiResponse = {
  results: number;
  response: RawFixture[];
};

class SportsApiClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.baseUrl = env.SPORTS_API_BASE_URL;
    this.headers = {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': env.SPORTS_API_KEY ?? '',
    };
  }

  private async get(path: string): Promise<ApiResponse> {
    const url = `${this.baseUrl}${path}`;
    return withRetry(
      async () => {
        const res = await fetch(url, { headers: this.headers });
        if (!res.ok) {
          throw new ExternalServiceError(
            'API-Football',
            `HTTP ${res.status} from ${path}`,
            { status: res.status, url },
          );
        }
        return res.json() as Promise<ApiResponse>;
      },
      2,
      1000,
    );
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  async getRecentFinishedFixtures(): Promise<RawFixture[]> {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const from = this.formatDate(yesterday);
    const to = this.formatDate(today);

    try {
      const data = await this.get(`/fixtures?status=FT&from=${from}&to=${to}`);
      const fixtures = data.response ?? [];
      log.info({ count: fixtures.length, from, to }, 'Fetched recent finished fixtures');
      return fixtures;
    } catch (err) {
      if (err instanceof ExternalServiceError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new ExternalServiceError('API-Football', message, err);
    }
  }

  async getFixtureById(externalId: string): Promise<RawFixture | null> {
    try {
      const data = await this.get(`/fixtures?id=${externalId}`);
      const fixture = data.response?.[0] ?? null;
      log.info({ externalId, found: fixture !== null }, 'Fetched fixture by id');
      return fixture;
    } catch (err) {
      if (err instanceof ExternalServiceError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new ExternalServiceError('API-Football', message, err);
    }
  }
}

export const sportsApiClient = new SportsApiClient();


