// Покрытие справочника: таблица SPEC 9.2 ↔ файлы src/content/components/*.yaml.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const DIR = root('src/content/components');

type SpecRow = { id: string; name: string; kind: string; count: string; icon: string };
type Component = {
  name: string;
  kind: string;
  count: number;
  perPlayer?: boolean;
  icon: string;
  howToTell: string;
  confusedWith?: string[];
};

/** Строки таблицы раздела «9.2 Компоненты справочника» из docs/SPEC.md. */
function specRows(): SpecRow[] {
  const spec = readFileSync(root('docs/SPEC.md'), 'utf8');
  const section = /### 9\.2 [^\n]*\n([\s\S]*?)\n### /.exec(spec)?.[1] ?? '';
  return section
    .split('\n')
    .map((line) =>
      /^\| `([a-z0-9-]+)` \| (.+?) \| ([a-z]+) \| (.+?) \| .+? \| `([a-z0-9-]+\.svg)`/.exec(line),
    )
    .filter((m): m is RegExpExecArray => m !== null)
    .map(([, id, name, kind, count, icon]) => ({
      id: id!,
      name: name!,
      kind: kind!,
      count: count!,
      icon: icon!,
    }));
}

const rows = specRows();
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => f.slice(0, -'.yaml'.length))
  .sort();
const components = new Map(
  files.map((id) => [id, parseYaml(readFileSync(`${DIR}/${id}.yaml`, 'utf8')) as Component]),
);

describe('SPEC 9.2 ↔ src/content/components', () => {
  it('таблица SPEC прочитана (23 компонента)', () => {
    expect(rows).toHaveLength(23);
  });

  it('набор id совпадает с файлами', () => {
    expect(files).toEqual(rows.map((r) => r.id).sort());
  });

  it.each(rows)('$id: kind, иконка и количество как в SPEC', (row) => {
    const c = components.get(row.id)!;
    expect(c.kind).toBe(row.kind);
    expect(c.icon).toBe(row.icon);
    // «90» → count; «10 × 5» → count + perPlayer; прочие ячейки (пояснения) не сверяются.
    const perPlayer = /^(\d+) × 5$/.exec(row.count);
    if (perPlayer) {
      expect(c.count).toBe(Number(perPlayer[1]));
      expect(c.perPlayer).toBe(true);
    } else if (/^\d+$/.test(row.count)) {
      expect(c.count).toBe(Number(row.count));
      expect(c.perPlayer ?? false).toBe(false);
    }
  });
});

describe('содержимое компонентов', () => {
  it.each(files)('%s: «как отличить» не пустое', (id) => {
    expect(components.get(id)!.howToTell.length).toBeGreaterThan(10);
  });

  it('confusedWith взаимный и без ссылок на себя', () => {
    const problems: string[] = [];
    for (const [id, c] of components) {
      for (const other of c.confusedWith ?? []) {
        if (other === id) problems.push(`${id} → сам на себя`);
        else if (!components.get(other)?.confusedWith?.includes(id)) {
          problems.push(`${id} → ${other}, но не ${other} → ${id}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('пары из SPEC 9.2 (тройки «Не перепутать») заданы', () => {
    const triples = [
      ['exploration-city', 'exploration-wilds', 'event-card'],
      ['location-token', 'monster-token', 'trail-token'],
      ['action-card', 'starter-cards', 'witcher-trophy'],
    ];
    for (const triple of triples) {
      for (const id of triple) {
        const others = triple.filter((o) => o !== id);
        expect(components.get(id)!.confusedWith, id).toEqual(expect.arrayContaining(others));
      }
    }
  });
});
