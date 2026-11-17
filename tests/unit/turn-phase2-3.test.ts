// Контент wizard'а хода: фаза II без битвы, фаза III, конец хода (ROADMAP R3.3, SPEC 8.3, 8.7, 11.5.1).
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
  resetTurn,
  visibleOptions,
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
/** Видимые пункты чек-листа текущего узла (как в ChecklistStep). */
const items = (s: WizardState) =>
  (node(s.current).checklist ?? []).filter((i) => evaluate(i.showIf, s)).map((i) => i.text);

/** Ход 3 игроков школой Кота, фаза I пропущена: стоим на p2-choose. */
const phase2 = (players: 2 | 3 | 4 | 5 = 3) => {
  const s = pick(advance(g, initState(g, 'turn', { players, school: 'cat' })), /^Нет/);
  expect(s.current).toBe('p2-choose');
  return s;
};
/** Пройти step/info-узлы до первого узла с выбором или конца. */
const walk = (s: WizardState) => {
  while (['step', 'info'].includes(node(s.current).type)) s = advance(g, s);
  return s;
};
const path = (s: WizardState) => [...s.history.map((h) => h.id), s.current];

describe('граф хода: фаза II', () => {
  it('p2-choose: битва, медитация, исследование; с предупреждением и стр. 15', () => {
    const s = phase2();
    expect(labels(s)).toEqual(['Битва', 'Медитация', 'Исследование']);
    expect(node('p2-choose')).toMatchObject({ type: 'choice', pages: 15 });
    expect(node('p2-choose').warning).toMatch(/другие/);
  });

  it('медитация, условия не выполнены — назад к выбору действия', () => {
    const s = pick(phase2(), 'Медитация');
    expect(s.current).toBe('p2-med-check');
    expect(choose(g, s, 1).current).toBe('p2-choose');
  });

  it('медитация, обычный трофей: трофей → истощение → фаза III', () => {
    let s = choose(g, pick(phase2(), 'Медитация'), 0);
    expect(s.current).toBe('p2-med-last-q');
    s = walk(choose(g, s, 1));
    expect(path(s)).toEqual(
      expect.arrayContaining(['p2-med-do', 'p2-med-exhaust', 'p3-discard', 'turn-end']),
    );
    expect(s.current).toBe('turn-end');
  });

  it('медитация, победный трофей: без продвижения и истощения, игра продолжается', () => {
    const s = choose(g, choose(g, pick(phase2(), 'Медитация'), 0), 0);
    expect(s.current).toBe('p2-med-last');
    expect(node('p2-med-last').warning).toMatch(/медитацией нельзя/i);
    const end = walk(s);
    expect(end.current).toBe('turn-end');
    expect(path(end)).not.toContain('p2-med-exhaust');
    expect(path(end)).not.toContain('game-won');
  });

  it.each(['Город', 'Окрестности'])(
    'исследование (%s): обе ветки результата ведут в фазу III',
    (where) => {
      const read = pick(pick(phase2(), 'Исследование'), where);
      expect(read.current).toBe('p2-explore-read');
      const result = advance(g, read);
      expect(labels(result)).toEqual(['Немедленный эффект', 'Задание']);
      for (const [label, id] of [
        ['Немедленный эффект', 'p2-explore-effect'],
        ['Задание', 'p2-explore-quest'],
      ] as const) {
        const s = pick(result, label);
        expect(s.current).toBe(id);
        expect(advance(g, s).current).toBe('p3-discard');
      }
    },
  );

  it('узлы исследования показывают подзоны колод (SPEC 11.5.1)', () => {
    expect(node('p2-explore-read').zones).toEqual(['z-exploration-city', 'z-exploration-wilds']);
    expect(node('p2-explore-read').warning).toMatch(/невыбранного/);
  });

  it('заглушка битвы: исходы ставят флаги и ведут в фазу III или к победе', () => {
    const t = pick(phase2(), 'Битва');
    expect(t.current).toBe('b-target');
    expect(pick(t, /не проиграл/)).toMatchObject({
      current: 'p3-discard',
      flags: { afterBattle: true },
    });
    expect(pick(t, /проиграл битву/)).toMatchObject({
      current: 'p3-discard',
      flags: { afterBattle: true, lostBattle: true },
    });
    expect(pick(t, 'Победа в игре').current).toBe('game-won');
    expect(pick(t, /Передумал/).current).toBe('p2-choose');
  });
});

describe('граф хода: фаза III и конец', () => {
  it('без битвы: обычный сброс до 3, полный добор', () => {
    const s = pick(pick(phase2(), 'Исследование'), 'Город');
    const discard = advance(g, pick(advance(g, s), 'Немедленный эффект'));
    expect(discard.current).toBe('p3-discard');
    expect(items(discard)).toEqual([expect.stringMatching(/осталось 3 или меньше/)]);
    const draw = advance(g, discard);
    expect(draw.current).toBe('p3-draw');
    expect(items(draw).join('\n')).not.toMatch(/на 1 карту меньше/);
  });

  it('afterBattle: «рука пуста», сброс до 3 скрыт; без lostBattle добор полный', () => {
    const discard = pick(pick(phase2(), 'Битва'), /не проиграл/);
    expect(items(discard)).toEqual([expect.stringMatching(/рука пуста/)]);
    expect(items(advance(g, discard)).join('\n')).not.toMatch(/на 1 карту меньше/);
  });

  it('lostBattle: добор на 1 карту меньше', () => {
    const draw = advance(g, pick(pick(phase2(), 'Битва'), /проиграл битву/));
    expect(draw.current).toBe('p3-draw');
    expect(items(draw)).toContainEqual(expect.stringMatching(/на 1 карту меньше/));
  });

  it('p3-buy и p3-refill подсвечивают подзоны ряда (SPEC 11.5.1)', () => {
    for (const id of ['p3-buy', 'p3-refill']) {
      expect(node(id).zones).toEqual(
        expect.arrayContaining(['z-action-row-plus1', 'z-action-row-minus1']),
      );
    }
    expect(node('p3-refill').zones).toContain('z-action-deck');
  });

  it('у узлов фаз II–III есть страницы и правила', () => {
    const ids = [...g.nodes.keys()].filter((id) =>
      /^(p2-|p3-|b-target|turn-end|game-won)/.test(id),
    );
    expect(ids.length).toBeGreaterThanOrEqual(17);
    for (const id of ids) {
      expect(node(id).pages, id).toBeDefined();
      expect(node(id).rules?.length, id).toBeGreaterThan(0);
    }
  });

  it('game-won — конец партии (outcome game-won, стр. 29)', () => {
    expect(node('game-won')).toMatchObject({ type: 'end', outcome: 'game-won', pages: 29 });
  });

  it('«Мой следующий ход»: школа и число игроков сохранены, флаги сброшены', () => {
    let s = pick(pick(phase2(5), 'Битва'), /проиграл битву/);
    s = walk(s);
    expect(s).toMatchObject({
      current: 'turn-end',
      flags: { afterBattle: true, lostBattle: true },
    });
    expect(node('turn-end')).toMatchObject({ outcome: 'turn-complete', resetTo: 't-start' });
    const next = resetTurn(g, s);
    expect(next).toMatchObject({
      current: 't-start',
      params: { players: 5, school: 'cat' },
      flags: {},
      history: [],
    });
  });

  it('«Назад» из фазы III после битвы откатывает флаги', () => {
    const s = pick(pick(phase2(), 'Битва'), /проиграл битву/);
    expect(back(g, s)).toMatchObject({ current: 'b-target', flags: {} });
  });
});
