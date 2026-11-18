// Контент wizard'а хода: битва с ведьмаком и ставки (ROADMAP R4.2, SPEC 8.6, книга стр. 15, 20–29).
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
import { actorLabel, visibleAlerts, type ViewNode } from '../../src/lib/wizard-view';

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

/** Фаза I пропущена, выбрана битва с ведьмаком: стоим на bw-check. */
const check = (players: PlayerCount = 3) => {
  let s = pick(advance(g, initState(g, 'turn', { players, school: 'wolf' })), /^Нет/);
  s = pick(pick(s, 'Битва'), 'Ведьмак');
  expect(s.current).toBe('bw-check');
  return s;
};
/** Нападение подтверждено, ставки (если есть) и запасы жизни пройдены: стоим на bw-turn. */
const battle = (players: PlayerCount = 3) => walk(pick(check(players), /^Да/));
const outcome = (label: string, players: PlayerCount = 3) =>
  pick(pick(battle(players), 'Кто-то потерял сознание'), label);

describe('битва с ведьмаком: начало', () => {
  it('подграф battle-witcher начинается с bw-check, заглушки нет', () => {
    const sub = entries.find((e) => e.subgraph === 'battle-witcher')!;
    expect(sub.entry).toBe('bw-check');
    expect(node('bw-check').type).toBe('question');
    expect(node('bw-check').title).not.toMatch(/разработке/);
  });

  it('bw-check: «нет» → p2-choose, флагов нет', () => {
    expect(pick(check(), /^Нет/)).toMatchObject({ current: 'p2-choose', flags: {} });
  });

  it('вопрос перечисляет все три запрета: школа, закрытая корчма, покер', () => {
    const q = node('bw-check').question ?? '';
    expect(q).toMatch(/школы/);
    expect(q).toMatch(/закрытой корчмы/);
    expect(q).toMatch(/покер/);
  });

  it('pokerPlayed показывает предупреждение в bw-check, без покера его нет', () => {
    expect(visibleAlerts(node('bw-check'), check())).toEqual([]);

    let s = pick(advance(g, initState(g, 'turn', { players: 3, school: 'wolf' })), /^Да/);
    s = advance(g, s); // p1-move-how → p1-arrived
    s = pick(s, /^Покер с ведьмаком/);
    s = advance(g, pick(s, /^Да/)); // p1-poker → p1-arrived
    expect(s.flags).toMatchObject({ pokerPlayed: true });
    s = pick(pick(pick(s, /^Закончить фазу I/), 'Битва'), 'Ведьмак');
    expect(s.current).toBe('bw-check');
    const [alert] = visibleAlerts(node('bw-check'), s);
    expect(alert).toMatch(/покер/);
  });

  it.each([3, 4, 5] as const)('%i игроков: «да» → ставки → запасы жизни → bw-turn', (players) => {
    let s = pick(check(players), /^Да/);
    expect(s.current).toBe('bw-bets');
    expect(items(s).join('\n')).toMatch(/1 золото/);
    expect(node('bw-bets').zones).toContain('z-player-area');
    s = advance(g, s);
    expect(s.current).toBe('bw-life');
    expect(advance(g, s).current).toBe('bw-turn');
  });

  it('2 игрока: ставок нет — «да» сразу к запасам жизни, «Назад» возвращает к bw-check', () => {
    const s = pick(check(2), /^Да/);
    expect(s.current).toBe('bw-life');
    expect(path(s)).not.toContain('bw-bets');
    expect(back(g, s).current).toBe('bw-check');
  });
});

describe('битва с ведьмаком: ходы', () => {
  it('один loop-узел: счётчик battleTurn, «Ходит:» чередуется — первым нападающий', () => {
    const n = node('bw-turn');
    expect(n).toMatchObject({ type: 'loop', counterKey: 'battleTurn' });
    expect(n.monsterAttack).toBeUndefined();
    expect([1, 2, 3, 4].map((t) => actorLabel(n, t))).toEqual([
      'Ходит: вы',
      'Ходит: соперник',
      'Ходит: вы',
      'Ходит: соперник',
    ]);
  });

  it('«Следующий ход» остаётся в bw-turn и растит счётчик, «Назад» откатывает', () => {
    let s = battle();
    s = pick(s, /^Следующий ход/);
    s = pick(s, /^Следующий ход/);
    expect(s).toMatchObject({ current: 'bw-turn', counters: { battleTurn: 2 } });
    expect(back(g, s).counters).toEqual({ battleTurn: 1 });
  });

  it('4 этапа хода и урон ведьмаку: щит → колода → рука', () => {
    const text = items(battle()).join('\n');
    for (const stage of ['1. Эффекты', '2. Комбинация', '3. Урон', '4. Добор'])
      expect(text).toContain(stage);
    expect(text).toMatch(/щит, потом .* колоды, потом из руки/);
  });

  it('bw-outcome: два исхода', () => {
    const s = pick(battle(), 'Кто-то потерял сознание');
    expect(s.current).toBe('bw-outcome');
    expect(labels(s)).toEqual(['Я победил', 'Победил соперник']);
  });
});

describe('битва с ведьмаком: исходы', () => {
  it.each([
    ['Я победил', ['bw-win-attacker', 'bw-win-top', 'bw-win-exhaust']],
    ['Победил соперник', ['bw-win-defender']],
  ] as const)('%s → bw-end → p3-discard → turn-end', (label, steps) => {
    let s = outcome(label);
    if (label === 'Я победил') s = pick(walk(s), 'Нет');
    s = walk(s);
    expect(s.current).toBe('turn-end');
    const p = path(s);
    expect(p.slice(p.indexOf('bw-outcome') + 1, p.indexOf('p3-discard') + 1)).toEqual([
      ...steps,
      'bw-end',
      'p3-discard',
    ]);
  });

  it('флаги: afterBattle при любом исходе, lostBattle — только у проигравшего нападающего', () => {
    expect(outcome('Я победил').flags).toEqual({ afterBattle: true });
    expect(outcome('Победил соперник').flags).toEqual({ afterBattle: true, lostBattle: true });
  });

  it('проигрыш нападающего: в фазе III добор на 1 меньше', () => {
    const s = walk(outcome('Победил соперник'));
    expect(s.current).toBe('turn-end');
    const draw = { ...s, current: 'p3-draw' };
    expect(items(draw).some((t) => /на 1 карту меньше/.test(t))).toBe(true);
  });

  it('bw-win-top: «да» → game-won', () => {
    const top = walk(outcome('Я победил'));
    expect(top.current).toBe('bw-win-top');
    expect(pick(top, /^Да/).current).toBe('game-won');
  });

  it('победа: трофей — только если его у вас ещё нет; золото по шкале; соперник берёт карту ст. 0', () => {
    const text = items(outcome('Я победил')).join('\n');
    expect(text).toMatch(/Если у вас ещё нет ведьмачьего трофея/);
    expect(text).toMatch(/шкале трофеев/);
    expect(text).toMatch(/Соперник: .*стоимостью 0/);
  });

  it('поражение: соперник берёт золото, вы — карту ст. 0', () => {
    const text = items(outcome('Победил соперник')).join('\n');
    expect(text).toMatch(/Соперник берёт золото/);
    expect(text).toMatch(/Вы: .*стоимостью 0/);
    expect(node('bw-win-defender').note).toMatch(/трофей не получает/);
  });

  it.each([2, 3, 4, 5] as const)('%i игроков: пункт про ставки в bw-end', (players) => {
    const s = walk(outcome('Победил соперник', players));
    const end = { ...s, current: 'bw-end' };
    expect(items(end).some((t) => /^Ставки/.test(t))).toBe(players >= 3);
  });

  it('bw-end: корчма на карте, эликсиры, щит, все карты, добор соперника 4/3', () => {
    const n = node('bw-end');
    expect(n.zones).toEqual(['z-map']);
    expect(n.components).toContain('closed-tavern');
    const text = (n.checklist ?? []).map((i) => i.text).join('\n');
    expect(text).toMatch(/закрытой корчмы/);
    expect(text).toMatch(/эликсиры/);
    expect(text).toMatch(/щит/);
    expect(text).toMatch(/колоду, сброс и руку/);
    expect(text).toMatch(/4 карты, если победил, или 3/);
  });

  it('у всех узлов битвы с ведьмаком есть страницы и правила', () => {
    const ids = entries.find((e) => e.subgraph === 'battle-witcher')!.nodes.map((n) => n.id);
    expect(ids).toEqual([
      'bw-check',
      'bw-bets',
      'bw-life',
      'bw-turn',
      'bw-outcome',
      'bw-win-attacker',
      'bw-win-top',
      'bw-win-exhaust',
      'bw-win-defender',
      'bw-end',
    ]);
    for (const id of ids) {
      expect(node(id).pages, id).toBeDefined();
      expect(node(id).rules?.length, id).toBeGreaterThan(0);
    }
  });
});
