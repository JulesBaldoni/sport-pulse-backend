// ─── Types ────────────────────────────────────────────────────────────────────

export type RawArticle = {
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: Date;
};

export type DetectedTopic = {
  entities: string[];
  keywords: string[];
  headline: string;
  sources: RawArticle[];
  sourcesCount: number;
  score: number;
};

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS_UPPER = new Set([
  // FR
  'Le', 'La', 'Les', 'Un', 'Une', 'Des', 'Du', 'De', 'En', 'Au', 'Aux',
  'Et', 'Ou', 'Par', 'Sur', 'Dans', 'Pour', 'Avec', 'Sans', 'Lors',
  // EN
  'The', 'A', 'An', 'Of', 'In', 'On', 'At', 'To', 'For', 'With',
  'And', 'Or', 'But', 'Is', 'Are', 'Was', 'Were', 'Has', 'Have',
]);

const STOP_WORDS_LOWER = new Set([
  // FR common
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'en', 'au', 'aux',
  'et', 'ou', 'par', 'sur', 'dans', 'pour', 'avec', 'sans', 'lors',
  'que', 'qui', 'ce', 'se', 'sa', 'son', 'ses', 'ils', 'elle', 'elles',
  'nous', 'vous', 'leur', 'leurs', 'je', 'tu', 'il', 'on', 'pas', 'plus',
  'très', 'bien', 'alors', 'mais', 'donc', 'ni', 'car', 'si',
  // EN common
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'has', 'have',
  'it', 'its', 'this', 'that', 'from', 'by', 'be', 'as', 'not',
  'his', 'her', 'they', 'them', 'he', 'she', 'we', 'you', 'do',
  'did', 'will', 'would', 'could', 'should', 'may', 'can', 'after',
  'about', 'over', 'all', 'more', 'into', 'than', 'up', 'out',
]);

const MAX_ENTITIES = 5;
const MAX_KEYWORDS = 10;
const MIN_KEYWORD_LENGTH = 4;
const MAX_TOPICS = 10;
const MIN_SCORE = 3;
const MAX_TOPICS_PER_SPORT = 3;

// ─── Entity extraction ────────────────────────────────────────────────────────

export function extractEntities(titles: string[]): string[] {
  const freq = new Map<string, number>();

  for (const title of titles) {
    const words = title.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-zA-ZÀ-ÿ'-]/g, '');
      if (
        clean.length > 2 &&
        /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ]/.test(clean) &&
        !STOP_WORDS_UPPER.has(clean)
      ) {
        freq.set(clean, (freq.get(clean) ?? 0) + 1);
      }
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_ENTITIES)
    .map(([word]) => word);
}

// ─── Keyword extraction (TF-IDF lite) ────────────────────────────────────────

export function extractKeywords(texts: string[]): string[] {
  const freq = new Map<string, number>();

  for (const text of texts) {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-zA-ZÀ-ÿ\s]/g, ' ')
      .split(/\s+/);

    for (const token of tokens) {
      if (token.length >= MIN_KEYWORD_LENGTH && !STOP_WORDS_LOWER.has(token)) {
        freq.set(token, (freq.get(token) ?? 0) + 1);
      }
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS)
    .map(([word]) => word);
}

// ─── Topic grouping ───────────────────────────────────────────────────────────

export function groupIntoTopics(articles: RawArticle[]): DetectedTopic[] {
  // Extract entities for each article
  const articleEntities = articles.map((a) => extractEntities([a.title]));

  // Union-Find for grouping
  const parent = articles.map((_, i) => i);

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  }

  function union(x: number, y: number): void {
    parent[find(x)] = find(y);
  }

  // Group articles that share at least 1 entity
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const entI = articleEntities[i] ?? [];
      const entJ = articleEntities[j] ?? [];
      if (entI.length === 0 || entJ.length === 0) continue;
      const shared = entI.some((e) => entJ.includes(e));
      if (shared) union(i, j);
    }
  }

  // Collect groups
  const groups = new Map<number, number[]>();
  for (let i = 0; i < articles.length; i++) {
    const root = find(i);
    const group = groups.get(root) ?? [];
    group.push(i);
    groups.set(root, group);
  }

  // Build DetectedTopic for each group
  const topics: DetectedTopic[] = [];

  for (const indices of groups.values()) {
    const groupArticles = indices.map((i) => articles[i]!);
    const allEntities = new Set<string>();
    for (const i of indices) {
      for (const e of articleEntities[i] ?? []) allEntities.add(e);
    }

    const entities = Array.from(allEntities).slice(0, MAX_ENTITIES);
    const allTexts = groupArticles.map((a) => `${a.title} ${a.content}`);
    const keywords = extractKeywords(allTexts);

    // Headline: article with most entities, or first
    const headline = groupArticles.reduce((best, a) => {
      const bEntCount = extractEntities([best.title]).length;
      const aEntCount = extractEntities([a.title]).length;
      return aEntCount > bEntCount ? a : best;
    }, groupArticles[0]!).title;

    const distinctSources = new Set(groupArticles.map((a) => a.source));

    topics.push({
      entities,
      keywords,
      headline,
      sources: groupArticles,
      sourcesCount: distinctSources.size,
      score: 0, // computed separately
    });
  }

  return topics;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function scoreTopic(topic: DetectedTopic, now: Date): number {
  let score = 0;

  // Each distinct source = 2 points
  score += topic.sourcesCount * 2;

  // Multiple named entities = more specific topic
  if (topic.entities.length >= 2) score += 2;

  // Recent articles bonus
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  let bonusOneHour = 0;
  let bonusFourHour = 0;

  for (const article of topic.sources) {
    if (article.publishedAt >= oneHourAgo) {
      bonusOneHour += 2;
    } else if (article.publishedAt >= fourHoursAgo) {
      bonusFourHour += 1;
    }
  }

  score += Math.min(bonusOneHour, 6);
  score += Math.min(bonusFourHour, 4);

  // Single source penalty
  if (topic.sourcesCount === 1) score -= 3;

  return score;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectHotTopics(
  articles: RawArticle[],
  now: Date = new Date(),
): DetectedTopic[] {
  const groups = groupIntoTopics(articles);

  return groups
    .map((topic) => ({ ...topic, score: scoreTopic(topic, now) }))
    .filter((topic) => topic.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TOPICS);
}

export { MAX_TOPICS_PER_SPORT };

