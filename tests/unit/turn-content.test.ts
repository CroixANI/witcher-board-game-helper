// Контент wizard'а хода, старт (ROADMAP R3.1, SPEC 8.2): t-params → t-school → t-start.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { turnGraph, type TurnEntry } from '../../src/lib/load-graph';
import {
  advance,
  choose,
  forgetParam,
  initState,
  resetTurn,
  SCHOOLS,
  visibleOptions,
  type Params,
  type WizardNode,
} from '../../src/lib/wizard-engine';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const DIR = root('src/content/turn');
const entries = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => parseYaml(readFileSync(`${DIR}/${f}`, 'utf8')) as TurnEntry);
const g = turnGraph(entries);
const node = (id: string) => g.nodes.get(id)!;
const start = (params: Params = {}) => initState(g, 'turn', params);

describe('граф хода: старт', () => {
  it('entry — t-params подграфа start', () => {
    expect(g.entry).toBe('t-params');
  });

  it('без параметров спрашивает число игроков, затем школу, затем t-start', () => {
    let s = start();
    expect(s.current).toBe('t-params');
    s = choose(g, s, 3); // 5 игроков
    expect(s).toMatchObject({ current: 't-school', params: { players: 5 } });
    s = choose(g, s, 4); // Змея
    expect(s).toMatchObject({ current: 't-start', params: { players: 5, school: 'viper' } });
  });

  it('параметры заданы — сразу t-start, вопросы не попадают в history', () => {
    const s = start({ players: 2, school: 'bear' });
    expect(s.current).toBe('t-start');
    expect(s.history).toEqual([]);
  });

  it('число игроков из подготовки — спрашивается только школа', () => {
    expect(start({ players: 3 }).current).toBe('t-school');
  });

  it('t-params: варианты 2–5 игроков', () => {
    const values = visibleOptions(node('t-params'), start()).map((o) => o.setParam?.value);
    expect(values).toEqual([2, 3, 4, 5]);
  });

  it('t-school: все пять школ, у каждой есть файл schools/<id>.yaml', () => {
    const values = visibleOptions(node('t-school'), start({ players: 2 })).map(
      (o) => o.setParam?.value,
    );
    expect(values.toSorted()).toEqual([...SCHOOLS].toSorted());
    const files = readdirSync(root('src/content/schools')).map((f) => f.replace(/\.yaml$/, ''));
    expect(files.toSorted()).toEqual([...SCHOOLS].toSorted());
  });

  it('у узлов старта есть страницы правил (SPEC 8.2)', () => {
    const pages = (id: string) => (node(id) as WizardNode & { pages: unknown }).pages;
    expect(pages('t-params')).toEqual([9, 12]);
    expect(pages('t-school')).toEqual([34, 35]);
    expect(pages('t-start')).toEqual([12, 13]);
  });

  it('ход доходит до turn-end, «Мой следующий ход» — снова t-start с теми же параметрами', () => {
    let s = start({ players: 4, school: 'wolf' });
    for (let guard = 0; node(s.current).type !== 'end'; guard++) {
      expect(guard).toBeLessThan(20);
      s = advance(g, s);
    }
    expect(s.current).toBe('turn-end');
    expect(resetTurn(g, s)).toMatchObject({
      current: 't-start',
      params: { players: 4, school: 'wolf' },
      history: [],
    });
  });

  it('«Сменить школу» на любом шаге — снова t-school', () => {
    const s = advance(g, start({ players: 4, school: 'wolf' }));
    expect(forgetParam(g, s, 'school')).toMatchObject({
      current: 't-school',
      params: { players: 4 },
    });
  });
});
