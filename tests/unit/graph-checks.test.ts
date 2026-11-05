import { describe, expect, it } from 'vitest';
import {
  checkGraphRefs,
  checkIcons,
  checkPagesAndRules,
  checkZones,
  nodeTargets,
  type GraphNode,
} from '../../src/lib/graph-checks';

const step = (id: string, next: GraphNode['next'], extra: Partial<GraphNode> = {}): GraphNode => ({
  id,
  pages: 6,
  next,
  ...extra,
});

describe('nodeTargets', () => {
  it('собирает все виды переходов', () => {
    expect(nodeTargets(step('a', 'b'))).toEqual(['b']);
    expect(nodeTargets(step('a', [{ to: 'b' }, { to: 'c' }]))).toEqual(['b', 'c']);
    expect(nodeTargets({ id: 'q', pages: 1, yes: { next: 'y' }, no: { next: 'n' } })).toEqual([
      'y',
      'n',
    ]);
    expect(nodeTargets({ id: 'c', pages: 1, options: [{ next: 'x' }, { next: 'y' }] })).toEqual([
      'x',
      'y',
    ]);
    expect(nodeTargets({ id: 'e', pages: 1, resetTo: 'start' })).toEqual(['start']);
    expect(nodeTargets({ id: 'e', pages: 1 })).toEqual([]);
  });
});

describe('checkGraphRefs (инвариант 1)', () => {
  it('корректный граф', () => {
    expect(checkGraphRefs('turn', [step('a', 'b'), { id: 'b', pages: 1 }], ['a'])).toEqual([]);
  });

  it('дублирующийся id', () => {
    expect(checkGraphRefs('setup', [step('a', 'a'), step('a', 'a')], [])).toEqual([
      'setup: дублирующийся id узла a',
    ]);
  });

  it('несуществующие цели во всех видах переходов', () => {
    const nodes: GraphNode[] = [
      step('a', [{ to: 'x1' }]),
      { id: 'b', pages: 1, options: [{ next: 'a' }, { next: 'x2' }] },
      { id: 'c', pages: 1, yes: { next: 'a' }, no: { next: 'x3' } },
      { id: 'd', pages: 1, resetTo: 'x4' },
    ];
    expect(checkGraphRefs('turn', nodes, [])).toEqual([
      'turn: узел a: переход на несуществующий узел x1',
      'turn: узел b: переход на несуществующий узел x2',
      'turn: узел c: переход на несуществующий узел x3',
      'turn: узел d: переход на несуществующий узел x4',
    ]);
  });

  it('несуществующий entry', () => {
    expect(checkGraphRefs('turn', [{ id: 'a', pages: 1 }], ['nope'])).toEqual([
      'turn: entry nope — несуществующий узел',
    ]);
  });
});

describe('checkPagesAndRules (инвариант 5)', () => {
  const rules = new Set(['meditation']);

  it('страницы и правила на месте', () => {
    const n = step('a', 'b', {
      pages: [15, 29],
      rules: ['meditation'],
      checklist: [{ rule: 'meditation' }, {}],
    });
    expect(checkPagesAndRules('turn', [n], rules)).toEqual([]);
  });

  it('пустые pages и pages вне 1–36', () => {
    expect(
      checkPagesAndRules(
        'turn',
        [step('a', 'b', { pages: [] }), step('b', 'a', { pages: 37 })],
        rules,
      ),
    ).toEqual(['turn: узел a: не указаны pages', 'turn: узел b: страница 37 вне 1–36']);
    expect(checkPagesAndRules('turn', [{ id: 'c' }], rules)).toEqual([
      'turn: узел c: не указаны pages',
    ]);
  });

  it('несуществующее правило в узле и в чек-листе', () => {
    const n = step('a', 'b', { rules: ['nope'], checklist: [{ rule: 'nope2' }] });
    expect(checkPagesAndRules('setup', [n], rules)).toEqual([
      'setup: узел a: несуществующее правило nope',
      'setup: узел a: несуществующее правило nope2',
    ]);
  });
});

describe('checkZones (инвариант 7)', () => {
  const zones = new Set(['z-board']);

  it('известные зоны', () => {
    expect(
      checkZones('setup', [step('a', 'b', { zones: ['z-board'] }), step('b', 'a')], zones),
    ).toEqual([]);
  });

  it('неизвестная зона', () => {
    expect(checkZones('setup', [step('a', 'b', { zones: ['z-board', 'z-x'] })], zones)).toEqual([
      'setup: узел a: неизвестная зона z-x',
    ]);
  });
});

describe('checkIcons (инвариант 7)', () => {
  it('нет файла иконки', () => {
    const available = new Set(['components/a.svg']);
    expect(
      checkIcons(
        [
          { source: 'components/a.yaml', icon: 'components/a.svg' },
          { source: 'components/b.yaml', icon: 'components/b.svg' },
        ],
        available,
      ),
    ).toEqual(['components/b.yaml: нет файла иконки src/assets/svg/components/b.svg']);
  });
});
