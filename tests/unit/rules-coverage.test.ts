// Покрытие карточек правил: таблица SPEC 9.1 ↔ файлы src/content/rules/*.md.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const RULES_DIR = root('src/content/rules');

/** Группы, карточки которых ещё не написаны. R1.5 добавит `battle` и очистит список. */
const PENDING_GROUPS = new Set(['battle']);
const MAX_WORDS = 150;

type SpecRow = { id: string; title: string; group: string; pages: number[] };

/** «6–7» → [6, 7]; «10, 29» → [10, 29]; «22, 27–28» → [22, 27, 28]. */
function parsePages(cell: string): number[] {
  return cell.split(',').flatMap((part) => {
    const [from, to] = part.trim().split(/[–-]/).map(Number);
    if (from === undefined || Number.isNaN(from)) throw new Error(`страницы: «${cell}»`);
    if (to === undefined) return [from];
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
}

/** Строки таблицы раздела «9.1 Карточки правил» из docs/SPEC.md. */
function specRows(): SpecRow[] {
  const spec = readFileSync(root('docs/SPEC.md'), 'utf8');
  const section = /### 9\.1 [^\n]*\n([\s\S]*?)\n### /.exec(spec)?.[1] ?? '';
  return section
    .split('\n')
    .map((line) => /^\| `([a-z0-9-]+)` \| (.+?) \| ([a-z0-9-]+) \| ([\d–\-, ]+) \|$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(([, id, title, group, pages]) => ({
      id: id!,
      title: title!,
      group: group!,
      pages: parsePages(pages!),
    }));
}

type Card = { data: { group: string; page: number | number[] }; body: string };

function readCard(id: string): Card {
  const text = readFileSync(`${RULES_DIR}/${id}.md`, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${id}.md: нет frontmatter`);
  return { data: parseYaml(match[1]!) as Card['data'], body: match[2]! };
}

const rows = specRows();
const ready = rows.filter((r) => !PENDING_GROUPS.has(r.group));

describe('parsePages', () => {
  it('одна страница, список и диапазоны', () => {
    expect(parsePages('9')).toEqual([9]);
    expect(parsePages('10, 29')).toEqual([10, 29]);
    expect(parsePages('6–7')).toEqual([6, 7]);
    expect(parsePages('22, 27–28')).toEqual([22, 27, 28]);
  });

  it('мусор — ошибка', () => {
    expect(() => parsePages('стр')).toThrow();
  });
});

describe('карточки правил ↔ SPEC 9.1', () => {
  it('таблица SPEC распознана целиком', () => {
    expect(rows.length).toBeGreaterThanOrEqual(77);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it.each(ready)('$id: файл есть, группа и страницы как в SPEC', ({ id, group, pages }) => {
    expect(existsSync(`${RULES_DIR}/${id}.md`), `нет src/content/rules/${id}.md`).toBe(true);
    const { data } = readCard(id);
    expect(data.group).toBe(group);
    const cardPages = [data.page].flat();
    expect(cardPages, 'страницы карточки должны включать страницы SPEC').toEqual(
      expect.arrayContaining(pages),
    );
  });
});

describe('карточки правил: объём', () => {
  const files = readdirSync(RULES_DIR).filter((f) => f.endsWith('.md'));

  it.each(files)('%s: текст ≤ 150 слов', (file) => {
    const { body } = readCard(file.slice(0, -3));
    const words = body.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
    expect(words).toBeLessThanOrEqual(MAX_WORDS);
  });
});
