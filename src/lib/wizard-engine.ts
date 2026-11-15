/**
 * Движок wizard'ов (SPEC 6): чистый TypeScript без UI и Astro.
 * Все функции чистые — возвращают новый state, исходный не меняют.
 *
 * Отличие от сигнатур SPEC 6.1: функции перехода принимают граф первым аргументом
 * (`choose(graph, state, i)`), потому что state хранит только id узлов.
 */
import type { SafeStorage } from './safe-storage';

// ── типы данных графа (структурно совместимы с узлами из content-schemas) ──
export type GraphName = 'setup' | 'turn';
export type PlayerCount = 2 | 3 | 4 | 5;
export const SCHOOLS = ['wolf', 'griffin', 'bear', 'cat', 'viper'] as const;
export type School = (typeof SCHOOLS)[number];

export type Condition = {
  readonly players?: readonly number[] | undefined;
  readonly flags?: Readonly<Record<string, boolean>> | undefined;
  readonly missingParam?: 'players' | 'school' | undefined;
};
export type Next =
  string | readonly { readonly when?: Condition | undefined; readonly to: string }[];

export type Option = {
  readonly label?: string | undefined;
  readonly next: string;
  readonly showIf?: Condition | undefined;
  readonly set?: Readonly<Record<string, boolean>> | undefined;
  readonly setParam?:
    { readonly key: 'players' | 'school'; readonly value: number | string } | undefined;
  readonly increment?: boolean | undefined;
};

export type WizardNode = {
  readonly id: string;
  readonly type: 'step' | 'info' | 'choice' | 'question' | 'loop' | 'end';
  readonly showIf?: Condition | undefined;
  readonly next?: Next | undefined;
  readonly options?: readonly Option[] | undefined;
  readonly yes?: Omit<Option, 'increment'> | undefined;
  readonly no?: Omit<Option, 'increment'> | undefined;
  readonly counterKey?: string | undefined;
  readonly resetTo?: string | undefined;
};

export type Graph<N extends WizardNode = WizardNode> = {
  readonly entry: string;
  readonly nodes: ReadonlyMap<string, N>;
};

// ── state ─────────────────────────────────────────────────────
export type Params = { players?: PlayerCount; school?: School };
export type Flags = Record<string, boolean>;
export type Counters = Record<string, number>;
/** Снапшот узла на момент входа в него — для «Назад» (SPEC 6.6). */
export type HistoryEntry = { id: string; flags: Flags; counters: Counters };

export type WizardState = {
  v: 1;
  graph: GraphName;
  params: Params; // переживают «Ход завершён»
  current: string;
  history: HistoryEntry[];
  flags: Flags; // сбрасываются на «Ход завершён»
  counters: Counters;
  checked: Record<string, number[]>; // отмеченные пункты чек-листов по узлам
  updatedAt: number;
};

export const HISTORY_LIMIT = 200;
export const PARAMS_KEY = 'twow:v1:params';
export const storageKey = (graph: GraphName): string => `twow:v1:${graph}`;

// ── граф ──────────────────────────────────────────────────────
export function buildGraph<N extends WizardNode>(nodes: readonly N[], entry: string): Graph<N> {
  const map = new Map<string, N>();
  for (const node of nodes) {
    if (map.has(node.id)) throw new Error(`wizard: дублирующийся id ${node.id}`);
    map.set(node.id, node);
  }
  if (!map.has(entry)) throw new Error(`wizard: entry ${entry} — несуществующий узел`);
  return { entry, nodes: map };
}

function nodeOf<N extends WizardNode>(g: Graph<N>, id: string): N {
  const node = g.nodes.get(id);
  if (!node) throw new Error(`wizard: несуществующий узел ${id}`);
  return node;
}

// ── условия и переходы ────────────────────────────────────────
export function evaluate(cond: Condition | undefined, s: WizardState): boolean {
  if (!cond) return true;
  if (cond.players && !(s.params.players && cond.players.includes(s.params.players))) return false;
  if (cond.flags && Object.entries(cond.flags).some(([k, v]) => (s.flags[k] ?? false) !== v))
    return false;
  if (cond.missingParam && s.params[cond.missingParam] !== undefined) return false;
  return true;
}

/** Строка — как есть; список — первый вариант, у которого `when` истинно. */
export function resolveNext(next: Next, s: WizardState): string {
  if (typeof next === 'string') return next;
  const hit = next.find((n) => evaluate(n.when, s));
  if (!hit) throw new Error(`wizard: нет перехода для текущих условий (${s.current})`);
  return hit.to;
}

/** Куда идти, если узел скрыт (`showIf=false`): по `next`, иначе — общий `next` всех вариантов. */
export function skipTarget(node: WizardNode, s: WizardState): string | undefined {
  if (node.next !== undefined) return resolveNext(node.next, s);
  const targets = new Set(answers(node).map((o) => o.next));
  return targets.size === 1 ? [...targets][0] : undefined;
}

/** Все варианты узла без фильтра по `showIf`. У `question` — «Да» и «Нет». */
function answers(node: WizardNode): Option[] {
  if (node.type === 'question') {
    return [
      ...(node.yes ? [{ ...node.yes, label: node.yes.label ?? 'Да' }] : []),
      ...(node.no ? [{ ...node.no, label: node.no.label ?? 'Нет' }] : []),
    ];
  }
  return node.type === 'choice' || node.type === 'loop' ? [...(node.options ?? [])] : [];
}

export function visibleOptions(node: WizardNode, s: WizardState): Option[] {
  return answers(node).filter((o) => evaluate(o.showIf, s));
}

/** Пропустить узлы с ложным `showIf` (в history не попадают). */
export function skipHidden(g: Graph, s: WizardState): WizardState {
  let current = s.current;
  for (let guard = 0; ; guard++) {
    const node = nodeOf(g, current);
    if (evaluate(node.showIf, s)) break;
    if (guard >= g.nodes.size) throw new Error(`wizard: цикл из скрытых узлов (${current})`);
    const target = skipTarget(node, { ...s, current });
    if (target === undefined) throw new Error(`wizard: нельзя пропустить узел ${current}`);
    current = target;
  }
  return current === s.current ? s : { ...s, current };
}

/** Переход в `target`: текущий узел и снапшот его флагов/счётчиков уходят в history. */
function move(g: Graph, from: WizardState, to: WizardState, target: string): WizardState {
  const entry: HistoryEntry = { id: from.current, flags: from.flags, counters: from.counters };
  const history = [...from.history, entry].slice(-HISTORY_LIMIT);
  nodeOf(g, target);
  return skipHidden(g, { ...to, current: target, history, updatedAt: Date.now() });
}

function applyParam(params: Params, setParam: NonNullable<Option['setParam']>): Params {
  const { key, value } = setParam;
  if (key === 'players') {
    if (!isPlayers(value)) throw new Error(`wizard: недопустимое значение players: ${value}`);
    return { ...params, players: value };
  }
  if (!isSchool(value)) throw new Error(`wizard: недопустимое значение school: ${value}`);
  return { ...params, school: value };
}

/** Выбор варианта `choice` / `question` / `loop`; индекс — среди видимых вариантов. */
export function choose(g: Graph, s: WizardState, optionIndex: number): WizardState {
  const node = nodeOf(g, s.current);
  if (node.type !== 'choice' && node.type !== 'question' && node.type !== 'loop')
    throw new Error(`wizard: узел ${node.id} (${node.type}) — используйте advance()`);
  const option = visibleOptions(node, s)[optionIndex];
  if (!option) throw new RangeError(`wizard: у узла ${node.id} нет варианта ${optionIndex}`);

  const counters =
    option.increment && node.counterKey
      ? { ...s.counters, [node.counterKey]: (s.counters[node.counterKey] ?? 0) + 1 }
      : s.counters;
  const next: WizardState = {
    ...s,
    flags: option.set ? { ...s.flags, ...option.set } : s.flags,
    params: option.setParam ? applyParam(s.params, option.setParam) : s.params,
    counters,
  };
  return move(g, s, next, option.next);
}

/** «Далее» на `step` / `info`. */
export function advance(g: Graph, s: WizardState): WizardState {
  const node = nodeOf(g, s.current);
  if ((node.type !== 'step' && node.type !== 'info') || node.next === undefined)
    throw new Error(`wizard: узел ${node.id} (${node.type}) — используйте choose()`);
  return move(g, s, s, resolveNext(node.next, s));
}

/** «Назад»: предыдущий узел и флаги/счётчики на момент входа в него. */
export function back(_g: Graph, s: WizardState): WizardState {
  const prev = s.history.at(-1);
  if (!prev) return s;
  return {
    ...s,
    current: prev.id,
    flags: prev.flags,
    counters: prev.counters,
    history: s.history.slice(0, -1),
    updatedAt: Date.now(),
  };
}

function fresh(g: Graph, graph: GraphName, params: Params, current: string): WizardState {
  return skipHidden(g, {
    v: 1,
    graph,
    params,
    current,
    history: [],
    flags: {},
    counters: {},
    checked: {},
    updatedAt: Date.now(),
  });
}

export function initState(g: Graph, graph: GraphName, params: Params = {}): WizardState {
  return fresh(g, graph, { ...params }, g.entry);
}

/** Новый ход: с `end` — в его `resetTo`, иначе в entry. Параметры сохраняются. */
export function resetTurn(g: Graph, s: WizardState): WizardState {
  const node = nodeOf(g, s.current);
  const target = node.type === 'end' && node.resetTo ? node.resetTo : g.entry;
  return fresh(g, s.graph, s.params, target);
}

/** Начать всё заново, включая параметры партии. */
export function restartAll(g: Graph, s: WizardState): WizardState {
  return fresh(g, s.graph, {}, g.entry);
}

// ── восстановление и хранение ────────────────────────────────
function isPlayers(v: unknown): v is PlayerCount {
  return v === 2 || v === 3 || v === 4 || v === 5;
}
function isSchool(v: unknown): v is School {
  return (SCHOOLS as readonly unknown[]).includes(v);
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isRecordOf<T>(v: unknown, item: (x: unknown) => x is T): v is Record<string, T> {
  return isRecord(v) && Object.values(v).every(item);
}
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isNumArray = (x: unknown): x is number[] => Array.isArray(x) && x.every(isNum);

/** Валидные параметры из произвольного значения; лишнее и битое отбрасывается. */
export function sanitizeParams(raw: unknown): Params {
  if (!isRecord(raw)) return {};
  const params: Params = {};
  if (isPlayers(raw.players)) params.players = raw.players;
  if (isSchool(raw.school)) params.school = raw.school;
  return params;
}

/**
 * State из хранилища. Если формат не тот, граф чужой или узлы неизвестны — новый state с entry;
 * параметры по возможности сохраняются (SPEC 6.5). `sharedParams` — общий ключ `twow:v1:params`:
 * его пишет каждый `saveState`, поэтому он свежее параметров внутри state и целиком их заменяет
 * (новая партия в подготовке → ход берёт новое число игроков). Если параметры изменились,
 * state начинается заново: шаги и флаги относились к другой партии.
 */
export function hydrate(
  g: Graph,
  graph: GraphName,
  raw: unknown,
  sharedParams?: Params,
): WizardState {
  const params = sharedParams ?? sanitizeParams(isRecord(raw) ? raw.params : undefined);
  const known = (id: unknown) => typeof id === 'string' && g.nodes.has(id);
  const valid =
    isRecord(raw) &&
    raw.v === 1 &&
    raw.graph === graph &&
    known(raw.current) &&
    Array.isArray(raw.history) &&
    raw.history.every(
      (h) =>
        isRecord(h) && known(h.id) && isRecordOf(h.flags, isBool) && isRecordOf(h.counters, isNum),
    ) &&
    isRecordOf(raw.flags, isBool) &&
    isRecordOf(raw.counters, isNum) &&
    isRecordOf(raw.checked, isNumArray) &&
    isNum(raw.updatedAt);
  if (!valid) return initState(g, graph, params);
  const state = raw as WizardState;
  const same = params.players === state.params.players && params.school === state.params.school;
  return same ? state : initState(g, graph, params);
}

function readJson(storage: SafeStorage, key: string): unknown {
  const text = storage.get(key);
  if (text === null) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function loadState(g: Graph, graph: GraphName, storage: SafeStorage): WizardState {
  const shared = readJson(storage, PARAMS_KEY);
  const params = isRecord(shared) ? sanitizeParams(shared) : undefined;
  return hydrate(g, graph, readJson(storage, storageKey(graph)), params);
}

/** Пишет state и общие параметры (их подхватывает другой wizard). */
export function saveState(storage: SafeStorage, s: WizardState): void {
  storage.set(storageKey(s.graph), JSON.stringify(s));
  storage.set(PARAMS_KEY, JSON.stringify(s.params));
}
