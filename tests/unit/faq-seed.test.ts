// Стартовое наполнение FAQ (SPEC 10.4, ROADMAP R5.3): состав и обязательные поля.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = fileURLToPath(new URL('../../src/content/faq/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
const front = (file: string) => {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(readFileSync(dir + file, 'utf8'));
  if (!m) throw new Error(`${file}: нет frontmatter`);
  return { head: m[1] ?? '', body: m[2] ?? '' };
};

/** Вопросы SPEC 10.4, которым нужен текст офиц. FAQ (его нет в репозитории): ждут пополнения. */
const WAITING_FOR_OFFICIAL_FAQ = [
  'return-card-multiple',
  'other-effects-order',
  'action-deck-empty',
  'purga-extra-card',
];

describe('FAQ: стартовый набор', () => {
  it('18 из 22 вопросов SPEC 10.4; остальные ждут офиц. FAQ', () => {
    expect(files).toHaveLength(18);
    for (const slug of WAITING_FOR_OFFICIAL_FAQ) expect(files).not.toContain(`${slug}.md`);
  });

  it.each(files)('%s: slug в kebab-case, есть rules, ответ ≤ 120 слов', (file) => {
    expect(file).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/);
    const { head, body } = front(file);
    expect(head).toMatch(/^rules: \[[^\]]+\]$/m);
    expect(body.trim().split(/\s+/).length).toBeLessThanOrEqual(120);
    expect(body).toMatch(/стр\. \d/);
  });

  it.each(files)('%s: источник rulebook → page, house → без страницы-подмены', (file) => {
    const { head } = front(file);
    if (/^source: rulebook$/m.test(head)) expect(head).toMatch(/^page: \d+$/m);
    expect(head).not.toMatch(/official-faq/);
  });
});
