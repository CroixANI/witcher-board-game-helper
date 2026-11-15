import { describe, expect, it } from 'vitest';
import {
  checkChoices,
  checkDeadEnds,
  checkGraphFlow,
  checkGraphRefs,
  checkLoops,
  checkReachable,
  checkIcons,
  checkPagesAndRules,
  checkComponentsPlaced,
  checkZoneFiles,
  checkZones,
  checkZoneTree,
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

// ── инварианты 2, 3, 4, 6 ───────────────────────────────────
const info = (id: string, next: GraphNode['next'], extra: Partial<GraphNode> = {}): GraphNode => ({
  id,
  type: 'info',
  pages: 1,
  next,
  ...extra,
});
const end = (id: string): GraphNode => ({ id, type: 'end', pages: 1 });

describe('checkReachable (инвариант 2)', () => {
  it('все узлы достижимы, в т. ч. через условные переходы и варианты', () => {
    const nodes: GraphNode[] = [
      info('a', [{ when: { players: [5] }, to: 'b' }, { to: 'c' }]),
      { id: 'b', type: 'choice', pages: 1, options: [{ next: 'c' }, { next: 'd' }] },
      info('c', 'd'),
      end('d'),
    ];
    expect(checkReachable('turn', nodes, ['a'])).toEqual([]);
  });

  it('сирота', () => {
    expect(checkReachable('setup', [info('a', 'b'), end('b'), info('x', 'b')], ['a'])).toEqual([
      'setup: узел x недостижим из entry',
    ]);
  });

  it('несколько корней', () => {
    expect(checkReachable('turn', [info('a', 'b'), end('b'), info('x', 'b')], ['a', 'x'])).toEqual(
      [],
    );
  });
});

describe('checkDeadEnds (инвариант 3)', () => {
  it('линейный граф и цикл с выходом — без ошибок', () => {
    const nodes: GraphNode[] = [
      info('a', 'loop'),
      {
        id: 'loop',
        type: 'loop',
        pages: 1,
        options: [{ next: 'loop' }, { next: 'z' }],
      },
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['a'])).toEqual([]);
  });

  it('тупик: step без выхода к end', () => {
    // b ведёт в c, c — в b: замкнутый цикл без выхода
    const nodes = [info('a', 'b'), info('b', 'c'), info('c', 'b'), end('z')];
    expect(checkDeadEnds('turn', nodes, ['a'])).toEqual([
      'turn: узел a: при 2, 3, 4, 5 игроках из него не дойти до end',
      'turn: узел b: при 2, 3, 4, 5 игроках из него не дойти до end',
      'turn: узел c: при 2, 3, 4, 5 игроках из него не дойти до end',
    ]);
  });

  it('петля loop без выхода', () => {
    const nodes: GraphNode[] = [
      {
        id: 'loop',
        type: 'loop',
        pages: 1,
        options: [{ next: 'loop' }, { next: 'loop' }],
      },
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['loop'])).toEqual([
      'turn: узел loop: при 2, 3, 4, 5 игроках из него не дойти до end',
    ]);
  });

  it('выход есть только при части players', () => {
    const nodes: GraphNode[] = [
      info('a', [
        { when: { players: [4, 5] }, to: 'z' },
        { when: { players: [2, 3] }, to: 'a' },
      ]),
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['a'])).toEqual([
      'turn: узел a: при 2, 3 игроках из него не дойти до end',
    ]);
  });

  it('вариант, скрытый по players, не считается выходом', () => {
    const nodes: GraphNode[] = [
      {
        id: 'c',
        type: 'choice',
        pages: 1,
        options: [{ next: 'c' }, { next: 'z', showIf: { players: [5] } }],
      },
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['c'])).toEqual([
      'turn: узел c: при 2, 3, 4 игроках из него не дойти до end',
    ]);
  });

  it('условный next без гарантированной ветви', () => {
    const nodes: GraphNode[] = [
      info('a', [{ when: { flags: { lostBattle: true } }, to: 'z' }]),
      info('b', [{ when: { players: [2, 3] }, to: 'z' }]),
      info('c', [{ when: { players: [4, 5], flags: { x: true } }, to: 'z' }, { to: 'z' }]),
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['a', 'b', 'c'])).toEqual([
      'turn: узел a: при 2, 3, 4, 5 игроках next может не найти перехода — нужна ветвь без условий по флагам',
      'turn: узел b: при 4, 5 игроках next может не найти перехода — нужна ветвь без условий по флагам',
      'turn: узел b: при 4, 5 игроках из него не дойти до end',
    ]);
  });

  it('флаги могут быть любыми: условие по флагу — возможный выход', () => {
    const nodes: GraphNode[] = [
      info('a', [{ when: { flags: { x: true } }, to: 'z' }, { to: 'a' }]),
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['a'])).toEqual([]);
  });

  it('скрытый по players узел пропускается по next', () => {
    const nodes: GraphNode[] = [
      info('a', 'b'),
      info('b', 'z', { showIf: { players: [4, 5] } }),
      end('z'),
    ];
    expect(checkDeadEnds('setup', nodes, ['a'])).toEqual([]);
  });

  it('скрытый узел без однозначного next для пропуска', () => {
    const nodes: GraphNode[] = [
      {
        id: 'c',
        type: 'choice',
        pages: 1,
        showIf: { missingParam: 'school' },
        options: [{ next: 'x' }, { next: 'z' }],
      },
      info('x', 'z'),
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['c'])).toEqual([
      'turn: узел c: есть showIf, но нет однозначного next для пропуска',
    ]);
  });

  it('недостижимые при этом числе игроков узлы не проверяются', () => {
    const nodes: GraphNode[] = [
      info('a', [{ when: { players: [5] }, to: 'b' }, { to: 'z' }]),
      info('b', [{ when: { players: [5] }, to: 'z' }, { to: 'b' }]),
      end('z'),
    ];
    expect(checkDeadEnds('turn', nodes, ['a'])).toEqual([]);
  });
});

describe('checkChoices (инвариант 4)', () => {
  it('≥ 2 видимых варианта при каждом числе игроков', () => {
    const c: GraphNode = {
      id: 'c',
      type: 'choice',
      pages: 1,
      options: [{ next: 'z' }, { next: 'z', showIf: { players: [4, 5] } }, { next: 'z' }],
    };
    expect(checkChoices('turn', [c])).toEqual([]);
  });

  it('меньше 2 вариантов при части players', () => {
    const c: GraphNode = {
      id: 'c',
      type: 'choice',
      pages: 1,
      options: [{ next: 'z' }, { next: 'z', showIf: { players: [4, 5] } }],
    };
    expect(checkChoices('turn', [c])).toEqual([
      'turn: узел c: при 2, 3 игроках видно меньше 2 вариантов',
    ]);
  });

  it('узел, скрытый при этом числе игроков или по missingParam, не проверяется', () => {
    const nodes: GraphNode[] = [
      {
        id: 'p',
        type: 'choice',
        pages: 1,
        showIf: { missingParam: 'players' },
        options: [{ next: 'z', showIf: { players: [5] } }, { next: 'z' }],
      },
      {
        id: 'q',
        type: 'choice',
        pages: 1,
        showIf: { players: [5] },
        options: [
          { next: 'z', showIf: { players: [5] } },
          { next: 'z', showIf: { players: [5] } },
        ],
      },
    ];
    expect(checkChoices('turn', nodes)).toEqual([]);
  });
});

describe('checkLoops (инвариант 6)', () => {
  it('loop с выходом', () => {
    const l: GraphNode = {
      id: 'l',
      type: 'loop',
      pages: 1,
      options: [{ next: 'l' }, { next: 'z' }],
    };
    expect(checkLoops('turn', [l, info('a', 'a')])).toEqual([]);
  });

  it('все варианты loop ведут в себя', () => {
    const l: GraphNode = {
      id: 'l',
      type: 'loop',
      pages: 1,
      options: [{ next: 'l' }, { next: 'l' }],
    };
    expect(checkLoops('turn', [l])).toEqual([
      'turn: узел l: у loop нет варианта, ведущего из него',
    ]);
  });
});

describe('checkGraphFlow', () => {
  it('объединяет инварианты 2, 3, 4, 6', () => {
    const nodes: GraphNode[] = [
      info('a', 'z'),
      end('z'),
      { id: 'l', type: 'loop', pages: 1, options: [{ next: 'l' }, { next: 'l' }] },
      { id: 'c', type: 'choice', pages: 1, options: [{ next: 'z' }] },
    ];
    expect(checkGraphFlow('turn', nodes, ['a'])).toEqual([
      'turn: узел l недостижим из entry',
      'turn: узел c недостижим из entry',
      'turn: узел c: при 2, 3, 4, 5 игроках видно меньше 2 вариантов',
      'turn: узел l: у loop нет варианта, ведущего из него',
    ]);
  });
});

const box = (id: string, x: number, y: number, w: number, h: number, parent?: string) => ({
  id,
  x,
  y,
  w,
  h,
  ...(parent === undefined ? {} : { parent }),
});

describe('checkZoneTree (инвариант 7б: parent)', () => {
  it('корректное дерево', () => {
    expect(
      checkZoneTree([box('z-row', 0, 0, 10, 30), box('z-row-a', 0, 0, 10, 10, 'z-row')]),
    ).toEqual([]);
  });

  it('неизвестный parent', () => {
    expect(checkZoneTree([box('z-a', 0, 0, 1, 1, 'z-nope')])).toEqual([
      'board-zones: зона z-a: неизвестный parent z-nope',
    ]);
  });

  it('parent — сама подзона (вложенность только в один уровень)', () => {
    expect(
      checkZoneTree([
        box('z-a', 0, 0, 10, 10),
        box('z-b', 0, 0, 5, 5, 'z-a'),
        box('z-c', 0, 0, 1, 1, 'z-b'),
      ]),
    ).toEqual(['board-zones: зона z-c: parent z-b сам является подзоной']);
  });

  it('подзона выходит за родителя по любой стороне', () => {
    const parent = box('z-p', 10, 10, 10, 10);
    expect(
      checkZoneTree([
        parent,
        box('z-left', 9, 10, 2, 2, 'z-p'),
        box('z-top', 10, 9, 2, 2, 'z-p'),
        box('z-right', 19, 10, 2, 2, 'z-p'),
        box('z-bottom', 10, 19, 2, 2, 'z-p'),
        box('z-inside', 10, 10, 10, 10, 'z-p'),
      ]),
    ).toEqual([
      'board-zones: подзона z-left выходит за родителя z-p',
      'board-zones: подзона z-top выходит за родителя z-p',
      'board-zones: подзона z-right выходит за родителя z-p',
      'board-zones: подзона z-bottom выходит за родителя z-p',
    ]);
  });
});

describe('checkZoneFiles (инвариант 7б: zones/*.yaml ↔ BOARD_ZONES)', () => {
  const known = new Set(['z-a', 'z-b']);

  it('1:1 — без ошибок', () => {
    expect(checkZoneFiles(['z-b', 'z-a'], known)).toEqual([]);
  });

  it('лишний файл и зона без файла', () => {
    expect(checkZoneFiles(['z-a', 'z-nope'], known)).toEqual([
      'zones/z-nope.yaml: зоны z-nope нет в src/data/board-zones.ts',
      'zones: нет файла zones/z-b.yaml для зоны из board-zones.ts',
    ]);
  });
});

describe('checkComponentsPlaced (инвариант 7в)', () => {
  const components = [
    { file: 'components/gold.yaml', id: 'gold' },
    { file: 'components/figure.yaml', id: 'figure' },
  ];

  it('каждый компонент хотя бы в одной зоне', () => {
    expect(
      checkComponentsPlaced(components, [{ components: ['gold'] }, { components: ['figure'] }]),
    ).toEqual([]);
  });

  it('компонент без зоны', () => {
    expect(
      checkComponentsPlaced(components, [{ components: ['gold'] }, { components: [] }]),
    ).toEqual([
      'components/figure.yaml: компонент не лежит ни в одной зоне (src/content/zones/*.yaml)',
    ]);
  });
});
