// Контент wizard'а подготовки (ROADMAP R2.3): узлы SPEC 7 и варианты по числу игроков.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { setupGraph } from '../../src/lib/load-graph';
import {
  advance,
  choose,
  evaluate,
  initState,
  visibleOptions,
  type Condition,
  type PlayerCount,
  type WizardNode,
  type WizardState,
} from '../../src/lib/wizard-engine';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));

type SetupNode = WizardNode & {
  title: string;
  pages: number | number[];
  zones?: string[];
  components?: string[];
  warning?: string;
  checklist?: { text: string; showIf?: Condition }[];
};

const DIR = root('src/content/setup');
const entries = readdirSync(DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(`${DIR}/${f}`, 'utf8'))?.[1] ?? '';
    return { file: f, ...(parseYaml(fm) as { order: number; node: SetupNode }) };
  })
  .toSorted((a, b) => a.order - b.order);
const byId = new Map(entries.map((e) => [e.node.id, e.node]));
const g = setupGraph(entries);

/** Узлы и порядок — таблица SPEC 7. */
const SPEC_IDS = [
  's00-params',
  's01-board',
  's02-action-row',
  's03-elixirs',
  's04-skill-trophies',
  's05-exploration-events',
  's06-gold-dice',
  's07-location-tokens',
  's08-monsters',
  's09-first-player',
  's10-player-components',
  's11-extra-4-5',
  's12-summary',
];

/** Проход от s00 с выбором числа игроков. Возвращает посещённые узлы и итоговое состояние. */
function walk(players: PlayerCount): { path: string[]; state: WizardState } {
  let s = initState(g, 'setup');
  const path: string[] = [];
  while (!path.includes(s.current)) {
    path.push(s.current);
    const node = g.nodes.get(s.current)!;
    if (node.type === 'end') break;
    if (node.type === 'choice') {
      const i = visibleOptions(node, s).findIndex((o) => o.setParam?.value === players);
      expect(i, `${node.id}: нет варианта для ${players} игроков`).toBeGreaterThanOrEqual(0);
      s = choose(g, s, i);
    } else {
      s = advance(g, s);
    }
  }
  return { path, state: s };
}

/** Видимые пункты чек-листа узла при заданном числе игроков. */
function visibleItems(id: string, players: PlayerCount): string[] {
  const s = initState(g, 'setup', { players });
  return (byId.get(id)?.checklist ?? []).filter((i) => evaluate(i.showIf, s)).map((i) => i.text);
}

describe('узлы подготовки по SPEC 7', () => {
  it('13 узлов s00…s12, order совпадает с номером в id и именем файла', () => {
    expect(entries.map((e) => e.node.id)).toEqual(SPEC_IDS);
    for (const e of entries) {
      expect(e.file).toBe(`${e.node.id}.md`);
      expect(e.node.id.slice(1, 3)).toBe(String(e.order).padStart(2, '0'));
    }
  });

  it('у каждого узла есть страницы правил в диапазоне 6–26', () => {
    for (const { node } of entries) {
      const pages = [node.pages].flat();
      expect(pages.length, node.id).toBeGreaterThan(0);
      for (const p of pages) expect(p, node.id).toBeGreaterThanOrEqual(6);
    }
  });

  it('у шагов есть зоны схемы (кроме s09) и компоненты', () => {
    for (const { node } of entries.filter((e) => e.node.type === 'step')) {
      if (node.id !== 's09-first-player') expect(node.zones?.length, node.id).toBeGreaterThan(0);
      expect(node.components?.length, node.id).toBeGreaterThan(0);
    }
  });

  it.each([
    's02-action-row',
    's05-exploration-events',
    's07-location-tokens',
    's08-monsters',
    's10-player-components',
  ])('%s: есть warning «Не перепутать»', (id) => {
    expect(byId.get(id)?.warning).toBeTruthy();
  });

  it('s00 предлагает ровно 2–5 игроков', () => {
    const s00 = byId.get('s00-params')!;
    expect(s00.type).toBe('choice');
    expect(s00.options?.map((o) => o.setParam?.value)).toEqual([2, 3, 4, 5]);
  });

  it('у каждого компонента шага в usedIn указан этот шаг', () => {
    for (const { node } of entries) {
      for (const c of node.components ?? []) {
        const yaml = parseYaml(readFileSync(root(`src/content/components/${c}.yaml`), 'utf8')) as {
          usedIn?: string[];
        };
        expect(yaml.usedIn ?? [], `${c} ← ${node.id}`).toContain(node.id);
      }
    }
  });
});

describe('проход подготовки по числу игрокам', () => {
  it.each([2, 3, 4, 5] as const)('%i игрока: путь до s12, параметр сохранён', (players) => {
    const { path, state } = walk(players);
    const expected = players >= 4 ? SPEC_IDS : SPEC_IDS.filter((id) => id !== 's11-extra-4-5');
    expect(path).toEqual(expected);
    expect(state.params.players).toBe(players);
  });

  it.each([
    [2, 4],
    [3, 4],
    [4, 8],
    [5, 8],
  ] as const)('s04: при %i игроках в колоде трофеев %i карт', (players, count) => {
    const text = visibleItems('s04-skill-trophies', players).join(' ');
    expect(text).toContain(count === 4 ? '4 карты' : 'все 8');
    expect(text).not.toContain(count === 4 ? 'все 8' : '4 карты');
  });

  it.each([2, 3, 4, 5] as const)(
    's08: монстр II уровня на старте только при 2 игроках (%i)',
    (players) => {
      const text = visibleItems('s08-monsters', players).join(' ');
      expect(text.includes('1 жетон II уровня')).toBe(players === 2);
      expect(text.includes('3 жетона I уровня')).toBe(players !== 2);
    },
  );

  it.each([2, 3, 4, 5] as const)('s10: ведьмачьих трофеев по числу соперников (%i)', (players) => {
    const items = visibleItems('s10-player-components', players).filter((t) =>
      t.startsWith('Ведьмачьи трофеи'),
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toContain(`${players - 1} карт`);
  });

  it.each([
    [4, '1 случайный жетон'],
    [5, '2 случайных жетона'],
  ] as const)('s11: доп. стопка монстров при %i игроках', (players, phrase) => {
    const items = visibleItems('s11-extra-4-5', players);
    expect(items.filter((t) => t.includes('дополнительная стопка'))).toHaveLength(1);
    expect(items.join(' ')).toContain(phrase);
  });
});
