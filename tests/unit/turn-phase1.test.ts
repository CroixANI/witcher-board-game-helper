// Контент wizard'а хода, фаза I и действия локаций (ROADMAP R3.2, SPEC 8.2, 8.4, 17.1).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { turnGraph, type TurnEntry } from '../../src/lib/load-graph';
import {
  advance,
  choose,
  initState,
  visibleOptions,
  type WizardState,
} from '../../src/lib/wizard-engine';
import type { ViewNode } from '../../src/lib/wizard-view';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const yamls = (dir: string) =>
  readdirSync(root(dir))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => ({ id: f.replace(/\.yaml$/, ''), data: parseYaml(readFileSync(root(`${dir}/${f}`), 'utf8')) }));

const entries = yamls('src/content/turn').map((e) => e.data as TurnEntry<ViewNode>);
const g = turnGraph(entries);
const node = (id: string) => g.nodes.get(id)!;
const actions = new Map(
  yamls('src/content/location-actions').map((e) => [
    e.id,
    e.data as { rule: string; icon: string; page: number | number[] },
  ]),
);

/** Ход вдвоём школой Медведя, как в примере стр. 30–32. */
const turn = () => advance(g, initState(g, 'turn', { players: 2, school: 'bear' }));
const labels = (s: WizardState) => visibleOptions(node(s.current), s).map((o) => o.label);
/** Выбрать вариант по подписи (устойчиво к перестановке вариантов). */
const pick = (s: WizardState, label: string | RegExp) => {
  const i = labels(s).findIndex((l) =>
    typeof label === 'string' ? l === label : label.test(l ?? ''),
  );
  expect(i, `вариант «${String(label)}» в ${s.current}: ${labels(s).join(' | ')}`).toBeGreaterThanOrEqual(0);
  return choose(g, s, i);
};

const LA = ['la-skill', 'la-poker-town', 'la-swap', 'la-elixir', 'la-school', 'la-hunt', 'la-gold-row'];

describe('граф хода: фаза I', () => {
  it('t-start ведёт к вопросу «Перемещаетесь?»; «Нет» — сразу к фазе II', () => {
    const s = turn();
    expect(s.current).toBe('p1-move-q');
    expect(pick(s, /^Нет/).current).toBe('p2-choose');
  });

  it('цикл p1-arrived ↔ p1-move-how, выход «Закончить фазу I»', () => {
    let s = advance(g, pick(turn(), /^Да/));
    expect(s.current).toBe('p1-arrived');
    s = pick(s, 'Переместиться ещё');
    expect(s.current).toBe('p1-move-how');
    s = advance(g, s);
    expect(s.current).toBe('p1-arrived');
    expect(pick(s, 'Закончить фазу I').current).toBe('p2-choose');
  });

  it('флаг moved ставится при перемещении, pokerPlayed — при игре в покер', () => {
    let s = turn();
    expect(s.flags).toEqual({});
    s = pick(s, /^Да/);
    expect(s.flags).toEqual({ moved: true });
    s = pick(advance(g, s), 'Покер с ведьмаком');
    expect(s.current).toBe('p1-poker-check');
    const declined = choose(g, s, 1);
    expect(declined).toMatchObject({ current: 'p1-arrived', flags: { moved: true } });
    s = choose(g, s, 0);
    expect(s).toMatchObject({ current: 'p1-poker', flags: { moved: true, pokerPlayed: true } });
    expect(advance(g, s).current).toBe('p1-arrived');
  });

  it('p1-arrived: пять вариантов по SPEC 8.2', () => {
    const s = advance(g, pick(turn(), /^Да/));
    expect(labels(s)).toEqual([
      'Действие локации',
      'Покер с ведьмаком',
      'Выполнить задание',
      'Переместиться ещё',
      'Закончить фазу I',
    ]);
    expect(advance(g, pick(s, 'Выполнить задание')).current).toBe('p1-arrived');
  });

  it('p1-loc-action: 7 действий с иконками, каждое ведёт в свой la-* и обратно в p1-arrived', () => {
    const arrived = advance(g, pick(turn(), /^Да/));
    const menu = pick(arrived, 'Действие локации');
    const options = visibleOptions(node('p1-loc-action'), menu) as ViewNode['options'] & object;
    expect(options.map((o) => o.next)).toEqual(LA);
    for (const [i, option] of options.entries()) {
      expect(option.icon, option.label).toMatch(/^actions\/loc-/);
      const step = choose(g, menu, i);
      expect(node(step.current).type).toBe('step');
      expect(advance(g, step).current).toBe('p1-arrived');
    }
  });

  it('la-*: действие из коллекции location-actions, его правило, иконка и страницы', () => {
    const options = node('p1-loc-action').options as ViewNode['options'] & object;
    for (const id of LA) {
      const n = node(id);
      const action = actions.get(n.locationAction ?? '');
      expect(action, `${id}: locationAction ${n.locationAction}`).toBeDefined();
      expect(n.rules, id).toContain(action!.rule);
      expect(options.find((o) => o.next === id)?.icon).toBe(
        `actions/${action!.icon.replace(/\.svg$/, '')}`,
      );
      expect([n.pages].flat(), id).toEqual(expect.arrayContaining([action!.page].flat()));
      expect(n.checklist?.some((c) => /1 раз за ход/.test(c.text)), `${id}: напоминание`).toBe(true);
    }
    expect([...actions.keys()].toSorted()).toEqual(
      LA.map((id) => node(id).locationAction).toSorted(),
    );
  });

  it('p1-move-how: 4 способа с иконками перемещения', () => {
    const icons = node('p1-move-how').checklist?.map((c) => c.icon);
    expect(icons).toEqual([
      'actions/move-terrain',
      'actions/move-two-cards',
      'actions/move-card-gold',
      'actions/move-joker',
    ]);
  });

  it('узлы, где важно, куда класть или откуда брать, показывают зоны поля (SPEC 11.5.1)', () => {
    expect(node('p1-move-how').zones).toContain('z-map');
    expect(node('p1-quest').zones).toEqual(expect.arrayContaining(['z-event-deck', 'z-location-stacks']));
    expect(node('la-hunt').zones).toContain('z-location-stacks');
    expect(node('la-swap').zones).toContain('z-action-row');
    expect(node('la-gold-row').zones).toContain('z-action-row');
    expect(node('la-elixir').zones).toContain('z-elixir-deck');
  });

  it('p2-choose пока заглушка: info → фаза III', () => {
    expect(node('p2-choose')).toMatchObject({ type: 'info', next: 'p3-discard' });
  });

  it('пример хода стр. 30–32, шаги 1–9 SPEC 17.1: до фазы II', () => {
    let s = turn(); // 1. t-start → p1-move-q
    s = advance(g, pick(s, /^Да/)); // 2. водная карта → Бан Ард
    s = advance(g, pick(pick(s, 'Действие локации'), /навык/i)); // 3. la-skill: алхимия +1
    expect(s.history.map((h) => h.id)).toContain('la-skill');
    s = advance(g, pick(s, 'Переместиться ещё')); // 4. горная карта → Каэр Морхен
    s = advance(g, choose(g, pick(s, 'Покер с ведьмаком'), 0)); // 5. покер, проигрыш
    s = advance(g, pick(pick(s, 'Действие локации'), /школ/i)); // 6. тренировка защиты
    s = advance(g, pick(s, 'Переместиться ещё')); // 7. джокер → Хенгфорс
    s = advance(g, pick(pick(s, 'Действие локации'), /выслеживан/i)); // 8. la-hunt
    expect(s.current).toBe('p1-arrived');
    s = pick(s, 'Закончить фазу I'); // 9. к фазе II
    expect(s).toMatchObject({ current: 'p2-choose', flags: { moved: true, pokerPlayed: true } });
    expect(s.history.map((h) => h.id)).toEqual(
      expect.arrayContaining(['la-skill', 'p1-poker', 'la-school', 'la-hunt']),
    );
  });
});
