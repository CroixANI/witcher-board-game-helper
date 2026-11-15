/**
 * Инварианты графов wizard'ов (SPEC 13.2).
 * Функции чистые: возвращают список ошибок, пустой — всё в порядке.
 */
import type { Condition, WizardNode } from './wizard-engine';

const PLAYER_COUNTS = [2, 3, 4, 5] as const;
type Players = (typeof PLAYER_COUNTS)[number];

/** Минимальная структура узла, нужная проверкам (совместима с узлами из content-schemas). */
export type GraphNode = {
  readonly id: string;
  readonly type?: WizardNode['type'] | undefined;
  readonly showIf?: Condition | undefined;
  readonly pages?: number | readonly number[] | undefined;
  readonly rules?: readonly string[] | undefined;
  readonly zones?: readonly string[] | undefined;
  readonly checklist?: readonly { readonly rule?: string | undefined }[] | undefined;
  readonly next?:
    string | readonly { readonly to: string; readonly when?: Condition | undefined }[] | undefined;
  readonly options?:
    readonly { readonly next: string; readonly showIf?: Condition | undefined }[] | undefined;
  readonly yes?: { readonly next: string } | undefined;
  readonly no?: { readonly next: string } | undefined;
  readonly resetTo?: string | undefined;
};

/** Все id, на которые узел может перейти. */
export function nodeTargets(node: GraphNode): string[] {
  const targets: string[] = [];
  if (typeof node.next === 'string') targets.push(node.next);
  else if (node.next) targets.push(...node.next.map((n) => n.to));
  if (node.options) targets.push(...node.options.map((o) => o.next));
  if (node.yes) targets.push(node.yes.next);
  if (node.no) targets.push(node.no.next);
  if (node.resetTo) targets.push(node.resetTo);
  return targets;
}

/** 1. Все id уникальны; все `next` / `to` / `resetTo` и точки входа существуют. */
export function checkGraphRefs(
  graph: string,
  nodes: readonly GraphNode[],
  entries: readonly string[],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const { id } of nodes) {
    if (ids.has(id)) errors.push(`${graph}: дублирующийся id узла ${id}`);
    ids.add(id);
  }
  for (const node of nodes) {
    for (const target of nodeTargets(node)) {
      if (!ids.has(target))
        errors.push(`${graph}: узел ${node.id}: переход на несуществующий узел ${target}`);
    }
  }
  for (const entry of entries) {
    if (!ids.has(entry)) errors.push(`${graph}: entry ${entry} — несуществующий узел`);
  }
  return errors;
}

/** 5. У каждого узла `pages` непустой и в 1–36; все `rules` (и `checklist[].rule`) существуют. */
export function checkPagesAndRules(
  graph: string,
  nodes: readonly GraphNode[],
  ruleIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  for (const node of nodes) {
    const pages = node.pages === undefined ? [] : [node.pages].flat();
    if (pages.length === 0) errors.push(`${graph}: узел ${node.id}: не указаны pages`);
    for (const page of pages) {
      if (!Number.isInteger(page) || page < 1 || page > 36)
        errors.push(`${graph}: узел ${node.id}: страница ${page} вне 1–36`);
    }
    const rules = [...(node.rules ?? []), ...(node.checklist ?? []).map((c) => c.rule)];
    for (const rule of rules) {
      if (rule !== undefined && !ruleIds.has(rule))
        errors.push(`${graph}: узел ${node.id}: несуществующее правило ${rule}`);
    }
  }
  return errors;
}

/** 7а. Все `zones` есть в `src/data/board-zones.ts`. */
export function checkZones(
  graph: string,
  nodes: readonly GraphNode[],
  zoneIds: ReadonlySet<string>,
): string[] {
  return nodes.flatMap((node) =>
    (node.zones ?? [])
      .filter((zone) => !zoneIds.has(zone))
      .map((zone) => `${graph}: узел ${node.id}: неизвестная зона ${zone}`),
  );
}

/** 7б. Все `icon` лежат на диске. `icon` — путь относительно `src/assets/svg/`. */
export function checkIcons(
  refs: readonly { readonly source: string; readonly icon: string }[],
  available: ReadonlySet<string>,
): string[] {
  return refs
    .filter(({ icon }) => !available.has(icon))
    .map(({ source, icon }) => `${source}: нет файла иконки src/assets/svg/${icon}`);
}

// ── инварианты 2, 3, 4, 6 ───────────────────────────────────
// Флаги и missingParam во время проверки неизвестны, поэтому условия по ним считаются
// «может быть и так, и так»; условия по players проверяются для каждого числа игроков.

const playersOk = (cond: Condition | undefined, p: Players) =>
  !cond?.players || cond.players.includes(p);

/** Скрыт ли узел при `p` игроках: да / нет / зависит от флагов или параметров. */
function visibility(node: GraphNode, p: Players): 'shown' | 'hidden' | 'maybe' {
  if (!node.showIf) return 'shown';
  if (!playersOk(node.showIf, p)) return 'hidden';
  return node.showIf.flags || node.showIf.missingParam ? 'maybe' : 'shown';
}

function nextTargets(node: GraphNode, p: Players): string[] {
  if (node.next === undefined) return [];
  if (typeof node.next === 'string') return [node.next];
  return node.next.filter((n) => playersOk(n.when, p)).map((n) => n.to);
}

function answerTargets(node: GraphNode): string[] {
  return [...(node.options ?? []).map((o) => o.next), node.yes?.next, node.no?.next].filter(
    (t): t is string => t !== undefined,
  );
}

/** Узел с `showIf`, который движок не сможет пропустить: нет `next`, а варианты расходятся. */
function unskippable(node: GraphNode): boolean {
  return (
    node.showIf !== undefined && node.next === undefined && new Set(answerTargets(node)).size !== 1
  );
}

/** Возможные переходы из узла при `p` игроках (как в движке, `resetTo` — не переход). */
function edgesAt(node: GraphNode, p: Players): string[] {
  const v = visibility(node, p);
  const shown =
    node.type === 'end'
      ? []
      : [
          ...nextTargets(node, p),
          ...(node.options ?? []).filter((o) => playersOk(o.showIf, p)).map((o) => o.next),
          ...[node.yes?.next, node.no?.next].filter((t): t is string => t !== undefined),
        ];
  if (v === 'shown') return shown;
  const skip = unskippable(node)
    ? []
    : node.next !== undefined
      ? nextTargets(node, p)
      : answerTargets(node);
  return v === 'hidden' ? skip : [...shown, ...skip];
}

function reach(roots: readonly string[], edges: (id: string) => readonly string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...edges(id));
  }
  return seen;
}

const playersList = (ps: readonly number[]) => ps.join(', ');

/** 2. Из entry достижим каждый узел (нет «сирот»). */
export function checkReachable(
  graph: string,
  nodes: readonly GraphNode[],
  roots: readonly string[],
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = reach(roots, (id) => {
    const node = byId.get(id);
    return node ? nodeTargets(node) : [];
  });
  return nodes
    .filter((n) => !seen.has(n.id))
    .map((n) => `${graph}: узел ${n.id} недостижим из entry`);
}

/** 3. Из каждого достижимого узла достижим `end` при каждом числе игроков (нет тупиков и петель). */
export function checkDeadEnds(
  graph: string,
  nodes: readonly GraphNode[],
  roots: readonly string[],
): string[] {
  const errors = nodes
    .filter(unskippable)
    .map((n) => `${graph}: узел ${n.id}: есть showIf, но нет однозначного next для пропуска`);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const stuck = new Map<string, Players[]>();
  for (const p of PLAYER_COUNTS) {
    const edges = new Map(nodes.map((n) => [n.id, edgesAt(n, p)]));
    const reverse = new Map<string, string[]>();
    for (const [from, targets] of edges) {
      for (const to of targets) reverse.set(to, [...(reverse.get(to) ?? []), from]);
    }
    const reachable = reach(roots, (id) => edges.get(id) ?? []);
    const ends = nodes.filter((n) => n.type === 'end').map((n) => n.id);
    const canEnd = reach(ends, (id) => reverse.get(id) ?? []);
    for (const id of reachable) {
      if (byId.has(id) && !canEnd.has(id)) stuck.set(id, [...(stuck.get(id) ?? []), p]);
    }
  }
  for (const node of nodes) {
    const ps = stuck.get(node.id);
    if (ps)
      errors.push(
        `${graph}: узел ${node.id}: при ${playersList(ps)} игроках из него не дойти до end`,
      );
  }
  return errors;
}

/** 4. У каждого `choice` при каждом числе игроков видно ≥ 2 вариантов.
 * Узлы, скрытые при этом числе игроков или по `missingParam` (t-params, t-school), не проверяются. */
export function checkChoices(graph: string, nodes: readonly GraphNode[]): string[] {
  return nodes
    .filter((n) => n.type === 'choice' && !n.showIf?.missingParam)
    .flatMap((node) => {
      const few = PLAYER_COUNTS.filter(
        (p) =>
          visibility(node, p) !== 'hidden' &&
          (node.options ?? []).filter((o) => playersOk(o.showIf, p)).length < 2,
      );
      return few.length
        ? [`${graph}: узел ${node.id}: при ${playersList(few)} игроках видно меньше 2 вариантов`]
        : [];
    });
}

/** 6. У каждого `loop` есть вариант, ведущий не в себя. */
export function checkLoops(graph: string, nodes: readonly GraphNode[]): string[] {
  return nodes
    .filter((n) => n.type === 'loop' && !(n.options ?? []).some((o) => o.next !== n.id))
    .map((n) => `${graph}: узел ${n.id}: у loop нет варианта, ведущего из него`);
}

/** Инварианты 2, 3, 4, 6 вместе (для validate-content). */
export function checkGraphFlow(
  graph: string,
  nodes: readonly GraphNode[],
  roots: readonly string[],
): string[] {
  return [
    ...checkReachable(graph, nodes, roots),
    ...checkDeadEnds(graph, nodes, roots),
    ...checkChoices(graph, nodes),
    ...checkLoops(graph, nodes),
  ];
}
