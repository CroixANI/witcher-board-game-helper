import { describe, expect, it } from 'vitest';
import {
  advance,
  back,
  buildGraph,
  choose,
  evaluate,
  hydrate,
  initState,
  loadState,
  PARAMS_KEY,
  resetTurn,
  resolveNext,
  restartAll,
  saveState,
  skipHidden,
  skipTarget,
  storageKey,
  visibleOptions,
  HISTORY_LIMIT,
  type Graph,
  type WizardNode,
  type WizardState,
} from '../../src/lib/wizard-engine';
import { createSafeStorage } from '../../src/lib/safe-storage';

// ── тестовый граф хода ───────────────────────────────────────
// params (choice, пропускается при заданных players) → school (choice, пропускается при school)
// → start (info) → q (question) → move (choice: флаги / только 4–5 игроков)
// → bets (step, только 3–5) → battle (loop) → done (end, resetTo start)
const nodes: WizardNode[] = [
  {
    id: 'params',
    type: 'choice',
    showIf: { missingParam: 'players' },
    options: [
      { label: '2', next: 'school', setParam: { key: 'players', value: 2 } },
      { label: '5', next: 'school', setParam: { key: 'players', value: 5 } },
    ],
  },
  {
    id: 'school',
    type: 'choice',
    showIf: { missingParam: 'school' },
    options: [
      { label: 'Волк', next: 'start', setParam: { key: 'school', value: 'wolf' } },
      { label: 'Кот', next: 'start', setParam: { key: 'school', value: 'cat' } },
    ],
  },
  { id: 'start', type: 'info', next: 'q' },
  {
    id: 'q',
    type: 'question',
    yes: { next: 'move', set: { moved: true } },
    no: { label: 'Пропустить', next: 'bets' },
  },
  {
    id: 'move',
    type: 'choice',
    options: [
      { label: 'Покер', next: 'bets', set: { pokerPlayed: true } },
      { label: 'Только 4–5', next: 'bets', showIf: { players: [4, 5] } },
      { label: 'Обычно', next: 'bets' },
    ],
  },
  {
    id: 'bets',
    type: 'step',
    showIf: { players: [3, 4, 5] },
    next: [{ when: { flags: { pokerPlayed: true } }, to: 'battle' }, { to: 'battle' }],
  },
  {
    id: 'battle',
    type: 'loop',
    counterKey: 'battleTurn',
    options: [
      { label: 'Следующий ход', next: 'battle', increment: true, set: { hit: true } },
      { label: 'Битва окончена', next: 'done' },
    ],
  },
  { id: 'done', type: 'end', resetTo: 'start' },
];

const g: Graph = buildGraph(nodes, 'params');

const state = (patch: Partial<WizardState> = {}): WizardState => ({
  ...initState(g, 'turn'),
  ...patch,
});

describe('buildGraph', () => {
  it('собирает Map по id', () => {
    expect(g.entry).toBe('params');
    expect(g.nodes.size).toBe(nodes.length);
    expect(g.nodes.get('q')?.type).toBe('question');
  });

  it('дублирующийся id — ошибка', () => {
    expect(() => buildGraph([nodes[2]!, nodes[2]!], 'start')).toThrow(/дублирующийся id start/);
  });

  it('несуществующий entry — ошибка', () => {
    expect(() => buildGraph(nodes, 'nope')).toThrow(/entry nope/);
  });
});

describe('evaluate', () => {
  const s = state({ params: { players: 3 }, flags: { moved: true } });

  it('нет условия — true', () => {
    expect(evaluate(undefined, s)).toBe(true);
    expect(evaluate({}, s)).toBe(true);
  });

  it('players: входит в список', () => {
    expect(evaluate({ players: [3, 4] }, s)).toBe(true);
    expect(evaluate({ players: [2] }, s)).toBe(false);
  });

  it('players при незаданном числе игроков — false', () => {
    expect(evaluate({ players: [2, 3, 4, 5] }, state())).toBe(false);
  });

  it('flags: отсутствующий флаг считается false', () => {
    expect(evaluate({ flags: { moved: true } }, s)).toBe(true);
    expect(evaluate({ flags: { moved: false } }, s)).toBe(false);
    expect(evaluate({ flags: { pokerPlayed: false } }, s)).toBe(true);
    expect(evaluate({ flags: { pokerPlayed: true } }, s)).toBe(false);
  });

  it('missingParam', () => {
    expect(evaluate({ missingParam: 'school' }, s)).toBe(true);
    expect(evaluate({ missingParam: 'players' }, s)).toBe(false);
  });

  it('несколько полей — AND', () => {
    expect(evaluate({ players: [3], flags: { moved: true } }, s)).toBe(true);
    expect(evaluate({ players: [3], flags: { moved: false } }, s)).toBe(false);
  });
});

describe('resolveNext', () => {
  const s = state({ params: { players: 2 }, flags: { lostBattle: true } });

  it('строка — как есть', () => {
    expect(resolveNext('x', s)).toBe('x');
  });

  it('первый подходящий when по порядку', () => {
    const next = [
      { when: { players: [4, 5] }, to: 'a' },
      { when: { flags: { lostBattle: true } }, to: 'b' },
      { to: 'c' },
    ];
    expect(resolveNext(next, s)).toBe('b');
    expect(resolveNext(next, state({ params: { players: 2 } }))).toBe('c');
  });

  it('ни один when не подошёл — ошибка', () => {
    expect(() => resolveNext([{ when: { players: [5] }, to: 'a' }], s)).toThrow(/нет перехода/);
  });
});

describe('skipTarget', () => {
  const s = state({ params: { players: 2 } });

  it('по next', () => {
    expect(skipTarget(g.nodes.get('bets')!, s)).toBe('battle');
  });

  it('у choice без next — общий next всех вариантов', () => {
    expect(skipTarget(g.nodes.get('params')!, s)).toBe('school');
  });

  it('варианты ведут в разные узлы — undefined', () => {
    expect(skipTarget(g.nodes.get('battle')!, s)).toBeUndefined();
    expect(skipTarget(g.nodes.get('q')!, s)).toBeUndefined();
    expect(skipTarget(g.nodes.get('done')!, s)).toBeUndefined();
  });

  it('у question с одинаковыми ответами — их next', () => {
    const q: WizardNode = { id: 'x', type: 'question', yes: { next: 'z' }, no: { next: 'z' } };
    expect(skipTarget(q, s)).toBe('z');
  });
});

describe('initState и пропуск showIf=false', () => {
  it('без параметров начинается с entry', () => {
    const s = initState(g, 'turn');
    expect(s).toMatchObject({
      v: 1,
      graph: 'turn',
      current: 'params',
      params: {},
      history: [],
      flags: {},
      counters: {},
      checked: {},
    });
    expect(typeof s.updatedAt).toBe('number');
  });

  it('заданные параметры пропускают params и school, не попадая в history', () => {
    const s = initState(g, 'turn', { players: 2, school: 'wolf' });
    expect(s.current).toBe('start');
    expect(s.history).toEqual([]);
  });

  it('skipHidden не трогает видимый узел', () => {
    const s = state();
    expect(skipHidden(g, s)).toBe(s);
  });

  it('скрытый узел без однозначного пути пропуска — ошибка', () => {
    const bad = buildGraph(
      [
        {
          id: 'a',
          type: 'choice',
          showIf: { players: [5] },
          options: [
            { label: '1', next: 'b' },
            { label: '2', next: 'c' },
          ],
        },
        { id: 'b', type: 'end' },
        { id: 'c', type: 'end' },
      ],
      'a',
    );
    expect(() => initState(bad, 'setup', { players: 2 })).toThrow(/нельзя пропустить узел a/);
  });

  it('цикл из скрытых узлов — ошибка, а не зависание', () => {
    const loop = buildGraph(
      [
        { id: 'a', type: 'info', showIf: { players: [5] }, next: 'b' },
        { id: 'b', type: 'info', showIf: { players: [5] }, next: 'a' },
      ],
      'a',
    );
    expect(() => initState(loop, 'setup', { players: 2 })).toThrow(/цикл/);
  });
});

describe('visibleOptions', () => {
  it('choice: скрывает варианты с showIf=false', () => {
    const labels = (players: 2 | 4) =>
      visibleOptions(g.nodes.get('move')!, state({ params: { players } })).map((o) => o.label);
    expect(labels(2)).toEqual(['Покер', 'Обычно']);
    expect(labels(4)).toEqual(['Покер', 'Только 4–5', 'Обычно']);
  });

  it('question: «Да» / «Нет» с подписями по умолчанию', () => {
    expect(visibleOptions(g.nodes.get('q')!, state()).map((o) => o.label)).toEqual([
      'Да',
      'Пропустить',
    ]);
  });

  it('step / info / end — без вариантов', () => {
    for (const id of ['start', 'bets', 'done']) {
      expect(visibleOptions(g.nodes.get(id)!, state())).toEqual([]);
    }
  });
});

describe('choose', () => {
  it('setParam players и school', () => {
    let s = initState(g, 'turn');
    s = choose(g, s, 1);
    expect(s.params).toEqual({ players: 5 });
    expect(s.current).toBe('school');
    s = choose(g, s, 1);
    expect(s.params).toEqual({ players: 5, school: 'cat' });
    expect(s.current).toBe('start');
    expect(s.history.map((h) => h.id)).toEqual(['params', 'school']);
  });

  it('question «Да» ставит флаг', () => {
    const s = choose(g, state({ current: 'q' }), 0);
    expect(s.current).toBe('move');
    expect(s.flags).toEqual({ moved: true });
  });

  it('индекс считается по видимым вариантам', () => {
    const s = choose(g, state({ current: 'move', params: { players: 2 } }), 1);
    expect(s.flags).toEqual({});
    expect(s.current).toBe('battle'); // bets пропущен при 2 игроках
    expect(s.history.map((h) => h.id)).toEqual(['move']);
  });

  it('при 4 игроках bets не пропускается, флаг варианта ставится', () => {
    const s = choose(g, state({ current: 'move', params: { players: 4 } }), 0);
    expect(s.flags).toEqual({ pokerPlayed: true });
    expect(s.current).toBe('bets');
  });

  it('loop: increment увеличивает счётчик, флаги ставятся', () => {
    let s = state({ current: 'battle' });
    s = choose(g, s, 0);
    s = choose(g, s, 0);
    expect(s.counters).toEqual({ battleTurn: 2 });
    expect(s.flags).toEqual({ hit: true });
    expect(s.current).toBe('battle');
    s = choose(g, s, 1);
    expect(s.counters).toEqual({ battleTurn: 2 });
    expect(s.current).toBe('done');
  });

  it('не меняет исходный state', () => {
    const s = state({ current: 'q' });
    const copy = structuredClone(s);
    choose(g, s, 0);
    expect(s).toEqual(copy);
  });

  it('неверный индекс — RangeError', () => {
    expect(() => choose(g, state({ current: 'q' }), 2)).toThrow(RangeError);
    expect(() => choose(g, state({ current: 'q' }), -1)).toThrow(RangeError);
  });

  it('на step / info — ошибка', () => {
    expect(() => choose(g, state({ current: 'start' }), 0)).toThrow(/advance/);
  });

  it('недопустимое значение setParam — ошибка', () => {
    const bad = buildGraph(
      [
        {
          id: 'a',
          type: 'choice',
          options: [
            { label: '7', next: 'b', setParam: { key: 'players', value: 7 } },
            { label: 'x', next: 'b', setParam: { key: 'school', value: 'dragon' } },
          ],
        },
        { id: 'b', type: 'end' },
      ],
      'a',
    );
    const s = initState(bad, 'setup');
    expect(() => choose(bad, s, 0)).toThrow(/players/);
    expect(() => choose(bad, s, 1)).toThrow(/school/);
  });
});

describe('advance', () => {
  it('info → next', () => {
    const s = advance(g, state({ current: 'start' }));
    expect(s.current).toBe('q');
    expect(s.history.map((h) => h.id)).toEqual(['start']);
  });

  it('step с условным next', () => {
    const s = advance(g, state({ current: 'bets', params: { players: 3 } }));
    expect(s.current).toBe('battle');
  });

  it('на choice / end — ошибка', () => {
    expect(() => advance(g, state({ current: 'q' }))).toThrow(/choose/);
    expect(() => advance(g, state({ current: 'done' }))).toThrow(/choose/);
  });
});

describe('back', () => {
  it('восстанавливает узел и снапшот флагов и счётчиков', () => {
    let s = state({ current: 'q', params: { players: 3 } });
    s = choose(g, s, 0); // moved
    s = choose(g, s, 0); // pokerPlayed → bets
    s = advance(g, s); // → battle
    s = choose(g, s, 0); // battleTurn 1, hit
    expect(s.counters).toEqual({ battleTurn: 1 });

    s = back(g, s);
    expect(s.current).toBe('battle');
    expect(s.counters).toEqual({});
    expect(s.flags).toEqual({ moved: true, pokerPlayed: true });

    s = back(g, s);
    s = back(g, s);
    expect(s.current).toBe('move');
    expect(s.flags).toEqual({ moved: true });

    s = back(g, s);
    expect(s.current).toBe('q');
    expect(s.flags).toEqual({});
    expect(s.history).toEqual([]);
  });

  it('пропущенные узлы не попадают в history', () => {
    let s = state({ current: 'move', params: { players: 2 } });
    s = choose(g, s, 1); // bets пропущен → battle
    s = back(g, s);
    expect(s.current).toBe('move');
  });

  it('пустая history — state без изменений', () => {
    const s = state();
    expect(back(g, s)).toBe(s);
  });

  it(`глубина history ≤ ${HISTORY_LIMIT}`, () => {
    let s = state({ current: 'battle' });
    for (let i = 0; i < HISTORY_LIMIT + 50; i++) s = choose(g, s, 0);
    expect(s.history).toHaveLength(HISTORY_LIMIT);
    expect(s.counters.battleTurn).toBe(HISTORY_LIMIT + 50);
    expect(s.history.at(-1)?.counters.battleTurn).toBe(HISTORY_LIMIT + 49);
  });
});

describe('resetTurn / restartAll', () => {
  const played = (): WizardState => {
    let s = initState(g, 'turn');
    s = choose(g, s, 0); // players 2
    s = choose(g, s, 0); // wolf → start
    s = advance(g, s);
    s = choose(g, s, 0); // moved → move
    return { ...s, checked: { start: [0] }, counters: { battleTurn: 3 } };
  };

  it('resetTurn: сбрасывает ход, параметры сохраняются', () => {
    const s = resetTurn(g, played());
    expect(s).toMatchObject({
      current: 'start',
      params: { players: 2, school: 'wolf' },
      flags: {},
      counters: {},
      history: [],
      checked: {},
    });
  });

  it('resetTurn на end идёт в resetTo', () => {
    const custom = buildGraph(
      [
        { id: 'a', type: 'info', next: 'b' },
        { id: 'b', type: 'info', next: 'c' },
        { id: 'c', type: 'end', resetTo: 'b' },
      ],
      'a',
    );
    let s = initState(custom, 'turn');
    s = advance(custom, advance(custom, s));
    expect(resetTurn(custom, s).current).toBe('b');
    expect(resetTurn(custom, { ...s, current: 'b' }).current).toBe('a');
  });

  it('restartAll: сбрасывает и параметры', () => {
    const s = restartAll(g, played());
    expect(s).toMatchObject({ current: 'params', params: {}, flags: {}, history: [] });
  });
});

describe('hydrate (восстановление после битого state)', () => {
  const good = (): WizardState => choose(g, initState(g, 'turn', { players: 3 }), 0);

  it('корректный state — как есть', () => {
    const s = good();
    expect(hydrate(g, 'turn', JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it.each([
    ['null', null],
    ['строка', 'oops'],
    ['массив', []],
    ['чужая версия', { ...good(), v: 2 }],
    ['чужой граф', { ...good(), graph: 'setup' }],
    ['неизвестный current', { ...good(), current: 'nope' }],
    ['битая history', { ...good(), history: [{ id: 'nope', flags: {}, counters: {} }] }],
    ['history не массив', { ...good(), history: 'x' }],
    ['flags не объект', { ...good(), flags: [true] }],
    ['флаг не boolean', { ...good(), flags: { moved: 1 } }],
    ['счётчик не число', { ...good(), counters: { battleTurn: 'x' } }],
    ['checked не массив чисел', { ...good(), checked: { start: ['a'] } }],
  ])('%s → сброс к entry', (_, raw) => {
    const s = hydrate(g, 'turn', raw);
    expect(s.history).toEqual([]);
    expect(s.flags).toEqual({});
  });

  it('при сбросе параметры по возможности сохраняются', () => {
    const s = hydrate(g, 'turn', { v: 2, params: { players: 4, school: 'viper' } });
    expect(s.params).toEqual({ players: 4, school: 'viper' });
    expect(s.current).toBe('start');
  });

  it('невалидные параметры отбрасываются', () => {
    const s = hydrate(g, 'turn', { v: 2, params: { players: 9, school: 'dragon' } });
    expect(s.params).toEqual({});
    expect(s.current).toBe('params');
  });

  it('параметры из общего ключа дополняют, но не перекрывают state', () => {
    expect(hydrate(g, 'turn', undefined, { players: 5 }).params).toEqual({ players: 5 });
    const s = hydrate(g, 'turn', JSON.parse(JSON.stringify(good())), { players: 5 });
    expect(s.params.players).toBe(3);
  });
});

describe('loadState / saveState', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return createSafeStorage(() => ({
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    }));
  };

  it('ключи', () => {
    expect(storageKey('setup')).toBe('twow:v1:setup');
    expect(storageKey('turn')).toBe('twow:v1:turn');
    expect(PARAMS_KEY).toBe('twow:v1:params');
  });

  it('сохраняет state и общие параметры, читает обратно', () => {
    const storage = memory();
    const s = advance(g, initState(g, 'turn', { players: 2, school: 'wolf' }));
    saveState(storage, s);
    expect(JSON.parse(storage.get(PARAMS_KEY)!)).toEqual({ players: 2, school: 'wolf' });
    expect(loadState(g, 'turn', storage)).toEqual(s);
  });

  it('пустое хранилище — начальный state с параметрами из подготовки', () => {
    const storage = memory();
    storage.set(PARAMS_KEY, JSON.stringify({ players: 4 }));
    const s = loadState(g, 'turn', storage);
    expect(s.params).toEqual({ players: 4 });
    expect(s.current).toBe('school');
  });

  it('битый JSON — начальный state', () => {
    const storage = memory();
    storage.set(storageKey('turn'), '{oops');
    storage.set(PARAMS_KEY, 'nope');
    expect(loadState(g, 'turn', storage).current).toBe('params');
  });
});
