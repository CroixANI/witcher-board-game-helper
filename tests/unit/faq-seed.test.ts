// Стартовое наполнение FAQ (SPEC 10.4, ROADMAP R5.3): состав и обязательные поля.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const dir = fileURLToPath(new URL('../../src/content/faq/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_'));

type Faq = { source: string; page?: number; rules?: string[] };
const read = (file: string) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(readFileSync(dir + file, 'utf8'));
  if (!m) throw new Error(`${file}: нет frontmatter`);
  return { data: parseYaml(m[1]!) as Faq, body: m[2]! };
};

/** Вопросы SPEC 10.4, добавленные в R5.3 (по книге правил и решению стола). */
const SEED_SLUGS = [
  'meditation-last-trophy',
  'act-in-start-location',
  'location-action-twice',
  'poker-then-fight',
  'quest-not-forced',
  'take-card-with-cost',
  'trail-token-gain',
  'remove-own-card-where',
  'buy-card-mandatory',
  'bets-two-players',
  'what-is-your-attack',
  'lower-skill-5',
  'two-trail-tokens',
  'deck-empty-in-battle',
  'once-per-battle-optional',
  'wolf-spec-timing',
  'skill-part-fails',
  'hand-limit-house',
];

describe('FAQ: стартовый набор', () => {
  it('все 18 вопросов R5.3 на месте', () => {
    for (const slug of SEED_SLUGS) expect(files, slug).toContain(`${slug}.md`);
  });

  it.each(files)('%s: slug в kebab-case, есть rules, ответ ≤ 120 слов', (file) => {
    expect(file).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/);
    const { data, body } = read(file);
    expect(data.rules?.length).toBeGreaterThan(0);
    expect(body.trim().split(/\s+/).length).toBeLessThanOrEqual(120);
  });

  it.each(files)('%s: rulebook → page и «стр. N» в ответе; house → без page', (file) => {
    const { data, body } = read(file);
    if (data.source === 'rulebook') {
      expect(data.page).toBeGreaterThan(0);
      expect(body).toMatch(/стр\. \d/);
    }
    if (data.source === 'house') expect(data.page).toBeUndefined();
  });
});
