import Parser from 'rss-parser'
import { createChildLogger } from '@/lib/logger.js'

const log = createChildLogger('rss-client')

export type RssArticle = {
  title: string
  content: string
  url: string
  source: string
  publishedAt: Date
}

export const RSS_FEEDS = [
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  { name: 'RMC Sport', url: 'https://rmcsport.bfmtv.com/rss/football.xml' },
  { name: "L'Equipe", url: 'https://www.lequipe.fr/rss/actu_rss.xml' },
  { name: 'Eurosport', url: 'https://www.eurosport.fr/rss.xml' },
] as const

type Feed = { name: string; url: string }

const SPORT_FEEDS: Record<string, Feed[]> = {
  football: [
    { name: 'BBC Sport Football', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
    { name: 'RMC Sport', url: 'https://rmcsport.bfmtv.com/rss/football.xml' },
    { name: "L'Equipe Football", url: 'https://www.lequipe.fr/Football/rss.xml' },
    { name: 'Eurosport Football', url: 'https://www.eurosport.fr/football/rss.xml' },
  ],
  basketball: [
    { name: 'BBC Sport Basketball', url: 'https://feeds.bbci.co.uk/sport/basketball/rss.xml' },
    { name: "L'Equipe Basket", url: 'https://www.lequipe.fr/Basket/rss.xml' },
  ],
  tennis: [
    { name: 'BBC Sport Tennis', url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml' },
    { name: "L'Equipe Tennis", url: 'https://www.lequipe.fr/Tennis/rss.xml' },
  ],
  rugby: [
    { name: 'BBC Sport Rugby Union', url: 'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml' },
    { name: "L'Equipe Rugby", url: 'https://www.lequipe.fr/Rugby/rss.xml' },
  ],
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
const MAX_CONTENT_LENGTH = 500
const MAX_ARTICLES = 10
const MAX_LATEST_ARTICLES = 30

class RssClient {
  private readonly parser: Parser

  constructor() {
    this.parser = new Parser({ timeout: 10000 })
  }

  private async fetchFeeds(feeds: Feed[], cutoffMs: number): Promise<RssArticle[]> {
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const parsed = await this.parser.parseURL(feed.url)
        return { feed, items: parsed.items }
      }),
    )

    const articles: RssArticle[] = []

    for (const result of results) {
      if (result.status === 'rejected') {
        log.warn(
          { error: result.reason instanceof Error ? result.reason.message : String(result.reason) },
          'RSS feed fetch failed',
        )
        continue
      }

      const { feed, items } = result.value

      for (const item of items) {
        const title = item.title ?? ''
        const rawContent = item.contentSnippet ?? item.content ?? item.summary ?? ''
        const url = item.link ?? ''
        const pubDate = item.pubDate ? new Date(item.pubDate) : null

        if (!pubDate || pubDate.getTime() < cutoffMs) continue
        if (!url) continue

        articles.push({
          title,
          content: rawContent.slice(0, MAX_CONTENT_LENGTH),
          url,
          source: feed.name,
          publishedAt: pubDate,
        })
      }
    }

    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    return articles
  }

  async fetchRecentArticles(query: string): Promise<RssArticle[]> {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    const cutoff = Date.now() - ONE_DAY_MS

    const all = await this.fetchFeeds([...RSS_FEEDS], cutoff)

    const filtered = all.filter((a) => {
      const titleLower = a.title.toLowerCase()
      return queryWords.some((word) => titleLower.includes(word))
    })

    return filtered.slice(0, MAX_ARTICLES)
  }

  async fetchLatestBySport(sportSlug: string): Promise<RssArticle[]> {
    const feeds = SPORT_FEEDS[sportSlug] ?? [...RSS_FEEDS]
    const cutoff = Date.now() - FOUR_HOURS_MS
    const articles = await this.fetchFeeds(feeds, cutoff)
    return articles.slice(0, MAX_LATEST_ARTICLES)
  }
}

export const rssClient = new RssClient()
