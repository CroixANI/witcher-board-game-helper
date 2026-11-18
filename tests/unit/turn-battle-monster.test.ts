// Контент wizard'а хода: битва с монстром (ROADMAP R4.1, SPEC 8.5, книга стр. 20–27, 29).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { turnGraph, type TurnEntry } from '../../src/lib/load-graph';
import {
  advance,
  back,
  choose,
  evaluate,
  initState,
  visibleOptions,
  type PlayerCount,
  type WizardState,
} from '../../src/lib/wizard-engine';
import type { ViewNode } from '../../src/lib/wizard-view';

const DIR = fileURLToPath(new URL('../../src/content/turn', import.meta.url));
const entries = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => parseYaml(readFileSync(`${DIR}/${f}`, 'utf8')) as TurnEntry<ViewNode>);
const g = turnGraph(entries);
const node = (id: string) => g.nodes.get(id)!;

const labels = (s: WizardState) => visibleOptions(node(s.current), s).map((o) => o.label);
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
const items = (s: WizardState) =>
  (node(s.current).checklist ?? []).filter((i) => evaluate(i.showIf, s)).map((i) => i.text);
const walk = (s: WizardState) => {
  for (let i = 0; ['step', 'info'].includes(node(s.current).type); i++) {
    expect(i).toBeLessThan(g.nodes.size);
    s = advance(g, s);
  }
  return s;
};
const path = (s: WizardState) => [...s.history.map((h) => h.id), s.current];

/** Фаза I пропущена, битва с монстром выбрана: стоим на bm-ability. */
const ability = (players: PlayerCount = 3) => {
  let s = pick(advance(g, initState(g, 'turn', { players, school: 'wolf' })), /^Нет/);
  s = pick(pick(s, 'Битва'), 'Монстр');
  expect(s.current).toBe('bm-ability');
  return s;
};
/** Битва началась: стоим на bm-first. */
const first = (players: PlayerCount = 3) => advance(g, pick(ability(players), /^Условия нет/));

describe('битва с монстром: начало', () => {
  it('b-target в подграфе battle-monster, без заглушки', () => {
    const sub = entries.find((e) => e.subgraph === 'battle-monster')!;
    expect(sub.entry).toBe('b-target');
    expect(node('b-target').title).not.toMatch(/разработке/);
  });

  it('bm-ability: не могу выполнить условие — назад к выбору действия, флагов нет', () => {
    const s = pick(ability(), /^Не могу/);
    expect(s).toMatchObject({ current: 'p2-choose', flags: {} });
  });

  it('bm-life показывает колоду боевых карт монстров; затем вопрос о следе', () => {
    const s = pick(ability(), /^Условия нет/);
    expect(s.current).toBe('bm-life');
    expect(node('bm-life').zones).toContain('z-monster-battle-deck');
    expect(advance(g, s).current).toBe('bm-first');
  });

  it('есть след — первым ходит ведьмак (witcherFirst), нет — монстр', () => {
    expect(pick(first(), /^Да/)).toMatchObject({
      current: 'bm-witcher-turn',
      flags: { witcherFirst: true },
    });
    const m = pick(first(), /^Нет/);
    expect(m.current).toBe('bm-monster-turn');
    expect(m.flags['witcherFirst']).toBeUndefined();
  });
});

describe('битва с монстром: цикл ходов', () => {
  it('ходы чередуются, счётчик battleTurn растёт, «Назад» его откатывает', () => {
    let s = pick(first(), /^Да/);
    s = pick(s, /Ход монстра/);
    expect(s).toMatchObject({ current: 'bm-monster-turn', counters: { battleTurn: 1 } });
    s = pick(s, /Ход ведьмака/);
    expect(s).toMatchObject({ current: 'bm-witcher-turn', counters: { battleTurn: 2 } });
    expect(back(g, s).counters).toEqual({ battleTurn: 1 });
  });

  it('оба loop-узла: «Ходит: …», общий счётчик, выход «Битва окончена» → bm-outcome', () => {
    for (const [id, actor] of [
      ['bm-witcher-turn', 'Ходит: вы'],
      ['bm-monster-turn', 'Ходит: монстр'],
    ] as const) {
      expect(node(id)).toMatchObject({ type: 'loop', counterKey: 'battleTurn', actorLabel: actor });
      expect(node(id).options?.find((o) => o.label === 'Битва окончена')?.next).toBe('bm-outcome');
    }
    expect(node('bm-monster-turn').monsterAttack).toBe(true);
    expect(node('bm-witcher-turn').monsterAttack).toBeUndefined();
  });

  it('bm-outcome: три исхода по стр. 26', () => {
    const s = pick(pick(first(), /^Нет/), 'Битва окончена');
    expect(labels(s)).toEqual(['Победа', 'Прогнал', 'Поражение']);
  });
});

describe('битва с монстром: исходы', () => {
  const outcome = (label: string, players: PlayerCount = 3) =>
    pick(pick(pick(first(players), /^Нет/), 'Битва окончена'), label);

  it.each([
    ['Победа', ['bm-win', 'bm-win-top', 'bm-win-exhaust', 'bm-new-monster-up']],
    ['Прогнал', ['bm-drive', 'bm-new-monster-same']],
    ['Поражение', ['bm-lose']],
  ] as const)('%s → b-end-monster → p3-discard', (label, steps) => {
    let s = outcome(label);
    if (label === 'Победа') s = pick(walk(s), 'Нет');
    s = walk(s);
    expect(s.current).toBe('turn-end');
    const p = path(s);
    const from = p.indexOf('bm-outcome') + 1;
    expect(p.slice(from, p.indexOf('p3-discard') + 1)).toEqual([
      ...steps,
      'b-end-monster',
      'p3-discard',
    ]);
  });

  it('после битвы рука пуста (afterBattle); добор на 1 меньше только при поражении', () => {
    for (const [label, lost] of [
      ['Прогнал', false],
      ['Поражение', true],
    ] as const) {
      const s = outcome(label);
      expect(s.flags).toMatchObject({ afterBattle: true });
      expect(s.flags['lostBattle'] === true).toBe(lost);
    }
    let win = pick(walk(outcome('Победа')), 'Нет');
    expect(win.flags).toEqual({ afterBattle: true });
    win = walk(win);
    expect(path(win)).toContain('b-end-monster');
  });

  it('bm-win-top: «да» → game-won', () => {
    const top = walk(outcome('Победа'));
    expect(top.current).toBe('bm-win-top');
    expect(pick(top, /^Да/).current).toBe('game-won');
  });

  it.each([2, 3, 4, 5] as const)(
    '%i игроков: пункт про доп. стопку виден только при 4–5',
    (players) => {
      let s = pick(walk(outcome('Победа', players)), 'Нет');
      s = advance(g, s); // bm-win-exhaust → bm-new-monster-up
      expect(s.current).toBe('bm-new-monster-up');
      const extra = items(s).some((t) => /дополнительной стопке/.test(t));
      expect(extra).toBe(players >= 4);
    },
  );

  it('узлы с колодами и жетонами монстров подсвечивают зоны поля (SPEC 11.5.1)', () => {
    const zones = (id: string) => node(id).zones ?? [];
    expect(zones('bm-life')).toContain('z-monster-battle-deck');
    expect(zones('b-end-monster')).toContain('z-monster-battle-deck');
    for (const id of ['bm-new-monster-up', 'bm-new-monster-same'])
      expect(zones(id)).toEqual(expect.arrayContaining(['z-monster-supply', 'z-monster-slots']));
    expect(zones('bm-win')).toContain('z-monster-slots');
    expect(zones('bm-drive')).toContain('z-monster-slots');
  });

  it('b-end-monster: эликсиры, щит, колода монстров и все карты действий', () => {
    const text = (node('b-end-monster').checklist ?? []).map((i) => i.text).join('\n');
    expect(text).toMatch(/эликсир/);
    expect(text).toMatch(/щит/);
    expect(text).toMatch(/боевые карты монстров/);
    expect(text).toMatch(/колоду, сброс и руку/);
  });

  it('у всех узлов битвы с монстром есть страницы и правила', () => {
    const ids = entries.find((e) => e.subgraph === 'battle-monster')!.nodes.map((n) => n.id);
    expect(ids).toHaveLength(15);
    for (const id of ids) {
      expect(node(id).pages, id).toBeDefined();
      expect(node(id).rules?.length, id).toBeGreaterThan(0);
    }
  });
});
