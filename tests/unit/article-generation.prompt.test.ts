import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseArticleResponse,
} from '@/integrations/mistral/prompts/article-generation.prompt.js';
import type { PromptInput } from '@/integrations/mistral/prompts/article-generation.prompt.js';
import { ValidationError } from '@/lib/errors.js';

const sampleInput: PromptInput = {
  match: {
    homeTeam: 'Paris Saint-Germain',
    awayTeam: 'Olympique de Marseille',
    homeScore: 2,
    awayScore: 1,
    competition: 'Ligue 1',
    venue: 'Parc des Princes',
    startedAt: new Date('2026-03-10T20:00:00Z'),
    sport: 'Football',
  },
  excerpts: [
    {
      title: 'PSG wins the classique',
      content: 'PSG dominated the match from start to finish.',
      source: 'L\'Equipe',
      url: 'https://example.com/article-1',
    },
  ],
  language: 'fr',
  tone: 'neutral',
};

describe('buildSystemPrompt', () => {
  it('fr prompt contains "journaliste sportif"', () => {
    const prompt = buildSystemPrompt('fr');
    expect(prompt).toContain('journaliste sportif');
  });

  it('fr prompt mentions JSON', () => {
    const prompt = buildSystemPrompt('fr');
    expect(prompt.toLowerCase()).toContain('json');
  });

  it('en prompt does not contain French-specific text', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).not.toContain('journaliste sportif');
    expect(prompt).not.toContain('Tu es');
  });

  it('en prompt contains "sports journalist"', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt).toContain('sports journalist');
  });

  it('en prompt mentions JSON', () => {
    const prompt = buildSystemPrompt('en');
    expect(prompt.toLowerCase()).toContain('json');
  });
});

describe('buildUserPrompt', () => {
  it('contains both team names', () => {
    const prompt = buildUserPrompt(sampleInput);
    expect(prompt).toContain('Paris Saint-Germain');
    expect(prompt).toContain('Olympique de Marseille');
  });

  it('contains the score', () => {
    const prompt = buildUserPrompt(sampleInput);
    expect(prompt).toContain('2 - 1');
  });

  it('contains the competition name', () => {
    const prompt = buildUserPrompt(sampleInput);
    expect(prompt).toContain('Ligue 1');
  });

  it('contains tone description for neutral', () => {
    const prompt = buildUserPrompt(sampleInput);
    // neutral tone description in French
    expect(prompt.toLowerCase()).toContain('factuel');
  });

  it('contains tone description for enthusiastic in English', () => {
    const prompt = buildUserPrompt({ ...sampleInput, language: 'en', tone: 'enthusiastic' });
    expect(prompt.toLowerCase()).toContain('energetic');
  });

  it('contains tone description for analytical', () => {
    const prompt = buildUserPrompt({ ...sampleInput, tone: 'analytical' });
    expect(prompt.toLowerCase()).toContain('anal');
  });

  it('contains excerpt source', () => {
    const prompt = buildUserPrompt(sampleInput);
    expect(prompt).toContain("L'Equipe");
  });

  it('handles "vs" when scores are null', () => {
    const prompt = buildUserPrompt({
      ...sampleInput,
      match: { ...sampleInput.match, homeScore: null, awayScore: null },
    });
    expect(prompt).toContain('vs');
  });
});

describe('parseArticleResponse', () => {
  const validContent = {
    title: 'PSG domine l\'OM',
    summary: 'Un classique dominé par le PSG.',
    content: 'Le Paris Saint-Germain a remporté le classique face à l\'OM...',
    sources: ['https://example.com/article-1'],
  };

  it('parses valid JSON and returns GeneratedArticleContent', () => {
    const result = parseArticleResponse(JSON.stringify(validContent));
    expect(result.title).toBe(validContent.title);
    expect(result.summary).toBe(validContent.summary);
    expect(result.content).toBe(validContent.content);
    expect(result.sources).toEqual(validContent.sources);
  });

  it('handles JSON wrapped in ```json fences', () => {
    const raw = '```json\n' + JSON.stringify(validContent) + '\n```';
    const result = parseArticleResponse(raw);
    expect(result.title).toBe(validContent.title);
  });

  it('handles JSON wrapped in plain ``` fences', () => {
    const raw = '```\n' + JSON.stringify(validContent) + '\n```';
    const result = parseArticleResponse(raw);
    expect(result.title).toBe(validContent.title);
  });

  it('throws ValidationError for invalid JSON', () => {
    expect(() => parseArticleResponse('not-json')).toThrow(ValidationError);
  });

  it('throws ValidationError when title is missing', () => {
    const { title: _title, ...noTitle } = validContent;
    expect(() => parseArticleResponse(JSON.stringify(noTitle))).toThrow(ValidationError);
  });

  it('throws ValidationError when content is missing', () => {
    const { content: _content, ...noContent } = validContent;
    expect(() => parseArticleResponse(JSON.stringify(noContent))).toThrow(ValidationError);
  });

  it('throws ValidationError when sources is not an array', () => {
    const invalid = { ...validContent, sources: 'not-an-array' };
    expect(() => parseArticleResponse(JSON.stringify(invalid))).toThrow(ValidationError);
  });

  it('accepts empty sources array', () => {
    const withEmptySources = { ...validContent, sources: [] };
    const result = parseArticleResponse(JSON.stringify(withEmptySources));
    expect(result.sources).toEqual([]);
  });
});

