// Сквозной сценарий хода (ROADMAP R3.5, SPEC 17.1–17.2): пример стр. 30–32 по реальному графу
// и граф-инварианты хода при 2–5 игроках. Шаги 10–21 (битва) — R4.3.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { checkGraphFlow, checkGraphRefs } from '../../src/lib/graph-checks';
import { graphRoots, turnGraph, type TurnEntry } from '../../src/lib/load-graph';
import {
  advance,
  choose,
  initState,
  resetTurn,
  visibleOptions,
  type PlayerCount,
  type WizardState,
} from '../../src/lib/wizard-engine';
import type { ViewNode } from '../../src/lib/wizard-view';

const dir = fileURLToPath(new URL('../../src/content/turn', import.meta.url));
const entries = readdirSync(dir)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => parseYaml(readFileSync(`${dir}/${f}`, 'utf8')) as TurnEntry<ViewNode>);
const g = turnGraph(entries);
const node = (id: string) => g.nodes.get(id)!;

const PLAYERS = [2, 3, 4, 5] as const satisfies readonly PlayerCount[];

const labels = (s: WizardState) => visibleOptions(node(s.current), s).map((o) => o.label);
/** Выбрать вариант по подписи (устойчиво к перестановке вариантов). */
const pick = (s: WizardState, label: string | RegExp) => {
  const i = labels(s).findIndex((l) =>
    typeof label === 'string' ? l === label : label.test(l ?? ''),
  );
  expect(
    i,
    `вариант «${String(label)}» в ${s.current}: ${labels(s).join(' | ')}`,
  ).toBeGreaterThanOrEqual(0);
  return choose(g, s, i);
};
/** Пройти step/info-узлы до первого узла с выбором или конца. */
const walk = (s: WizardState) => {
  for (let i = 0; ['step', 'info'].includes(node(s.current).type); i++) {
    expect(i, `цикл из step/info-узлов на ${s.current}`).toBeLessThan(g.nodes.size);
    s = advance(g, s);
  }
  return s;
};
const path = (s: WizardState) => [...s.history.map((h) => h.id), s.current];

/** Шаги 1–9 SPEC 17.1 (школа Медведя): фаза I примера и выход в фазу II. */
function examplePhase1(players: PlayerCount): WizardState {
  let s = advance(g, initState(g, 'turn', { players, school: 'bear' })); // 1. t-start, действие в Венгерберге нельзя
  expect(s.current).toBe('p1-move-q');
  s = advance(g, pick(s, /^Да/)); // 2. водная карта → Бан Ард
  s = advance(g, pick(pick(s, 'Действие локации'), /навык/i)); // 3. la-skill: алхимия +1 → эликсир
  s = advance(g, pick(s, 'Переместиться ещё')); // 4. горная карта → Каэр Морхен
  s = advance(g, choose(g, pick(s, 'Покер с ведьмаком'), 0)); // 5. покер, проигрыш
  s = advance(g, pick(pick(s, 'Действие локации'), /школ/i)); // 6. тренировка защиты в чужой школе
  s = advance(g, pick(s, 'Переместиться ещё')); // 7. джокер → Хенгфорс
  s = advance(g, pick(pick(s, 'Действие локации'), /выслеживан/i)); // 8. la-hunt
  expect(s.current).toBe('p1-arrived');
  return pick(s, 'Закончить фазу I'); // 9. к фазе II
}

describe('пример хода стр. 30–32 (SPEC 17.1)', () => {
  it.each(PLAYERS)('%i игрока: шаги 1–9 доходят до b-target', (players) => {
    let s = examplePhase1(players);
    expect(s).toMatchObject({ current: 'p2-choose', flags: { moved: true, pokerPlayed: true } });
    s = pick(s, 'Битва'); // 9. битва с архиспорой
    expect(s.current).toBe('b-target');
    expect(path(s)).toEqual([
      't-start',
      'p1-move-q',
      'p1-move-how',
      'p1-arrived',
      'p1-loc-action',
      'la-skill',
      'p1-arrived',
      'p1-move-how',
      'p1-arrived',
      'p1-poker-check',
      'p1-poker',
      'p1-arrived',
      'p1-loc-action',
      'la-school',
      'p1-arrived',
      'p1-move-how',
      'p1-arrived',
      'p1-loc-action',
      'la-hunt',
      'p1-arrived',
      'p2-choose',
      'b-target',
    ]);
  });

  it('после фазы I примера ход завершается через исследование, «Мой следующий ход» — снова t-start', () => {
    let s = pick(examplePhase1(2), 'Исследование');
    s = walk(pick(s, 'Окрестности'));
    expect(s.current).toBe('p2-explore-result');
    s = walk(pick(s, 'Задание'));
    expect(s.current).toBe('turn-end');
    expect(path(s).slice(-9)).toEqual([
      'p2-explore-where',
      'p2-explore-read',
      'p2-explore-result',
      'p2-explore-quest',
      'p3-discard',
      'p3-draw',
      'p3-buy',
      'p3-refill',
      'turn-end',
    ]);
    expect(resetTurn(g, s)).toMatchObject({
      current: 't-start',
      params: { players: 2, school: 'bear' },
      flags: {},
      history: [],
    });
  });
});

describe('граф хода: инварианты SPEC 13.2 на реальном контенте', () => {
  it('переходы разрешаются, нет сирот, тупиков и петель без выхода при 2–5 игроках', () => {
    const nodes = entries.flatMap((e) => e.nodes);
    const refs = checkGraphRefs(
      'turn',
      nodes,
      entries.map((e) => e.entry),
    );
    expect(refs).toEqual([]);
    expect(checkGraphFlow('turn', nodes, graphRoots('turn', entries))).toEqual([]);
  });

  // Движком, с учётом флагов и showIf: из каждого достижимого состояния можно дойти до end.
  it.each(PLAYERS)('%i игрока: каждое достижимое состояние движка ведёт к end', (players) => {
    const key = (s: WizardState) => `${s.current} ${JSON.stringify(s.flags)}`;
    const states = new Map<string, WizardState>();
    const edges = new Map<string, string[]>();
    const queue = [advance(g, initState(g, 'turn', { players, school: 'wolf' }))];
    for (let s = queue.shift(); s; s = queue.shift()) {
      const k = key(s);
      if (states.has(k)) continue;
      states.set(k, s);
      const n = node(s.current);
      const nexts =
        n.type === 'end'
          ? []
          : ['step', 'info'].includes(n.type)
            ? [advance(g, s)]
            : visibleOptions(n, s).map((_, i) => choose(g, s, i));
      expect(nexts.length || n.type === 'end', `тупик в ${k}`).toBeTruthy();
      edges.set(k, nexts.map(key));
      queue.push(...nexts);
    }
    const canEnd = new Set(
      [...states].filter(([, s]) => node(s.current).type === 'end').map(([k]) => k),
    );
    for (let grew = true; grew;) {
      grew = false;
      for (const [k, to] of edges) {
        if (!canEnd.has(k) && to.some((t) => canEnd.has(t))) {
          canEnd.add(k);
          grew = true;
        }
      }
    }
    const stuck = [...states.keys()].filter((k) => !canEnd.has(k));
    expect(stuck).toEqual([]);
    const reached = new Set([...states.values()].map((s) => s.current));
    expect([...reached]).toEqual(expect.arrayContaining(['turn-end', 'game-won', 'b-target']));
  });

  // SPEC 13.2, п. 4: у p1-move-q ровно 2 варианта (checkChoices проверяет только ≥ 2).
  it.each(PLAYERS)('%i игрока: у p1-move-q ровно 2 варианта', (players) => {
    const s = advance(g, initState(g, 'turn', { players, school: 'wolf' }));
    expect(s.current).toBe('p1-move-q');
    expect(labels(s)).toHaveLength(2);
  });
});
