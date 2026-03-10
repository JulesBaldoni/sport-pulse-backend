import { z } from 'zod'
import { ValidationError } from '@/lib/errors.js'
import type { GeneratedArticleContent } from '@/modules/articles/articles.types.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchContext = {
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  competition: string
  venue: string | null
  startedAt: Date
  sport: string
}

export type NewsExcerpt = {
  title: string
  content: string
  source: string
  url: string
}

export type PromptInput = {
  match: MatchContext
  excerpts: NewsExcerpt[]
  language: 'fr' | 'en'
  tone: 'neutral' | 'analytical' | 'enthusiastic'
}

// ─── Zod schema for response validation ───────────────────────────────────────

const generatedArticleSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
  sources: z.array(z.string()),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function toneDescription(tone: PromptInput['tone'], language: 'fr' | 'en'): string {
  const descriptions: Record<PromptInput['tone'], Record<'fr' | 'en', string>> = {
    neutral: {
      fr: 'Factuel et objectif. Rapporte les faits sans opinion personnelle.',
      en: 'Factual and objective. Report the facts without personal opinion.',
    },
    analytical: {
      fr: 'Analyse approfondie. Explique les tactiques, performances et implications.',
      en: 'In-depth analysis. Explain tactics, performances, implications.',
    },
    enthusiastic: {
      fr: 'Énergique et passionné. Mets en avant le drama et les moments clés.',
      en: 'Energetic and passionate. Highlight the drama and key moments.',
    },
  }
  return descriptions[tone][language]
}

// ─── Exported functions ───────────────────────────────────────────────────────

export function buildSystemPrompt(language: 'fr' | 'en'): string {
  if (language === 'fr') {
    return [
      'Tu es un journaliste sportif professionnel. Tu rédiges des articles de presse',
      "clairs, précis et engageants à partir de données de match et d'extraits d'articles",
      'existants. Tu ne dois jamais inventer de faits. Si les données sont insuffisantes,',
      "indique-le dans l'article. Tu réponds UNIQUEMENT en JSON valide, sans markdown,",
      'sans texte avant ou après.',
    ].join('\n')
  }
  return [
    'You are a professional sports journalist. You write clear, precise and engaging',
    'press articles from match data and excerpts of existing articles.',
    'You must never invent facts. If the data is insufficient, indicate it in the article.',
    'You respond ONLY with valid JSON, no markdown, no text before or after.',
  ].join('\n')
}

export function buildUserPrompt(input: PromptInput): string {
  const { match, excerpts, language, tone } = input
  const scoreStr =
    match.homeScore !== null && match.awayScore !== null
      ? `${match.homeScore} - ${match.awayScore}`
      : 'vs'
  const langLabel = language === 'fr' ? 'French' : 'English'

  const excerptLines = excerpts
    .map((e) => `Source: ${e.source} — ${e.title}\n${e.content.slice(0, 500)}\n---`)
    .join('\n')

  return [
    'MATCH DATA:',
    `- Sport: ${match.sport}`,
    `- Competition: ${match.competition}`,
    `- Date: ${formatDate(match.startedAt)}`,
    `- ${match.homeTeam} ${scoreStr} ${match.awayTeam}`,
    `- Venue: ${match.venue ?? 'Unknown'}`,
    '',
    `TONE: ${toneDescription(tone, language)}`,
    '',
    excerpts.length > 0
      ? `PRESS EXCERPTS (use these as source material, do not copy verbatim):\n${excerptLines}`
      : 'PRESS EXCERPTS: None available.',
    '',
    `Write a sports article in ${langLabel} about this match.`,
    'Respond ONLY with this exact JSON structure, no markdown:',
    '{',
    '  "title": "compelling article title",',
    '  "summary": "2-3 sentence teaser for the article",',
    '  "content": "full article body, minimum 300 words, maximum 600 words",',
    '  "sources": ["url1", "url2"]',
    '}',
  ].join('\n')
}

export function parseArticleResponse(raw: string): GeneratedArticleContent {
  // Strip accidental markdown fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new ValidationError('Failed to parse Mistral response as JSON', {
      raw: cleaned.slice(0, 200),
    })
  }

  const result = generatedArticleSchema.safeParse(parsed)
  if (!result.success) {
    throw new ValidationError(
      'Mistral response does not match expected schema',
      result.error.issues,
    )
  }

  return result.data
}

// ─── Topic-based prompts ──────────────────────────────────────────────────────

export type TopicPromptInput = {
  headline: string
  entities: string[]
  keywords: string[]
  excerpts: Array<{
    title: string
    content: string
    source: string
    url: string
  }>
  language: 'fr' | 'en'
  tone: 'neutral' | 'analytical' | 'enthusiastic'
}

export function buildTopicSystemPrompt(language: 'fr' | 'en'): string {
  if (language === 'fr') {
    return [
      "Tu es un journaliste sportif professionnel spécialisé dans l'actualité du sport.",
      'Tu rédiges des articles de synthèse à partir de plusieurs sources de presse.',
      'Tu identifies les faits importants, tu les contextualises, et tu rédiges un article',
      'original sans copier les sources. Tu ne dois jamais inventer de faits.',
      'Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.',
    ].join('\n')
  }
  return [
    'You are a professional sports journalist specializing in sports news.',
    'You write synthesis articles from multiple press sources.',
    'You identify key facts, contextualize them, and write an original article without copying sources.',
    'You must never invent facts.',
    'You respond ONLY with valid JSON, no markdown, no text before or after.',
  ].join('\n')
}

export function buildTopicUserPrompt(input: TopicPromptInput): string {
  const { headline, entities, keywords, excerpts, language, tone } = input
  const langLabel = language === 'fr' ? 'French' : 'English'

  const toneDesc = toneDescription(tone, language)

  const excerptLines = excerpts
    .map((e) => `Source: ${e.source} — ${e.title}\n${e.content.slice(0, 500)}\n---`)
    .join('\n')

  return [
    'TOPIC:',
    `Main subject: ${headline}`,
    `Key entities: ${entities.join(', ') || 'N/A'}`,
    `Keywords: ${keywords.join(', ') || 'N/A'}`,
    '',
    `TONE: ${toneDesc}`,
    '',
    `PRESS SOURCES (${excerpts.length} sources):`,
    excerptLines || 'No sources available.',
    '',
    `Write an original sports news article in ${langLabel} synthesizing these sources.`,
    'The article must:',
    '- Report only facts mentioned in the sources',
    "- Contextualize the news (why it matters, what's at stake)",
    '- Be between 250 and 500 words',
    '- Have an engaging, informative title',
    '',
    'Respond ONLY with this exact JSON:',
    '{',
    '  "title": "article title",',
    '  "summary": "2-3 sentence teaser",',
    '  "content": "full article body",',
    '  "sources": ["url1", "url2"]',
    '}',
  ].join('\n')
}
