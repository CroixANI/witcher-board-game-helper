/**
 * Сборка `Graph` из коллекций контента (SPEC 5.2, 6.1).
 * Чистые функции принимают данные записей — их используют и Astro-страницы, и тесты;
 * `loadGraph()` читает коллекции через `astro:content` (только в Astro).
 */
import { buildGraph, type Graph, type GraphName, type WizardNode } from './wizard-engine';

export type SetupEntry<N extends { id: string } = WizardNode> = { order: number; node: N };
export type TurnSubgraph =
  | 'start'
  | 'phase1'
  | 'location-actions'
  | 'phase2'
  | 'battle-monster'
  | 'battle-witcher'
  | 'phase3';
export type TurnEntry<N = WizardNode> = { subgraph: TurnSubgraph; entry: string; nodes: N[] };

/** Точки входа для проверок графа: setup — первый по `order`; turn — entry подграфа `start`,
 * а пока его нет (граф хода собирается по частям, R3.x) — entry всех подграфов. */
export function graphRoots(
  graph: 'setup',
  entries: readonly SetupEntry<{ id: string }>[],
): string[];
export function graphRoots(
  graph: 'turn',
  entries: readonly Pick<TurnEntry, 'subgraph' | 'entry'>[],
): string[];
export function graphRoots(
  graph: GraphName,
  entries: readonly (SetupEntry<{ id: string }> | Pick<TurnEntry, 'subgraph' | 'entry'>)[],
): string[] {
  if (graph === 'setup') {
    const first = (entries as SetupEntry<{ id: string }>[]).toSorted(
      (a, b) => a.order - b.order,
    )[0];
    return first ? [first.node.id] : [];
  }
  const subgraphs = entries as Pick<TurnEntry, 'subgraph' | 'entry'>[];
  const start = subgraphs.find((e) => e.subgraph === 'start');
  return start ? [start.entry] : subgraphs.map((e) => e.entry);
}

export function setupGraph<N extends WizardNode>(entries: readonly SetupEntry<N>[]): Graph<N> {
  const sorted = entries.toSorted((a, b) => a.order - b.order);
  const entry = sorted[0]?.node.id;
  if (entry === undefined) throw new Error('wizard: коллекция setup пуста');
  return buildGraph(
    sorted.map((e) => e.node),
    entry,
  );
}

export function turnGraph<N extends WizardNode>(entries: readonly TurnEntry<N>[]): Graph<N> {
  const start = entries.find((e) => e.subgraph === 'start');
  if (!start) throw new Error('wizard: в коллекции turn нет подграфа start');
  return buildGraph(
    entries.flatMap((e) => e.nodes),
    start.entry,
  );
}

/** Граф из коллекции Astro. Вызывать только на этапе сборки (frontmatter страниц). */
export async function loadGraph(graph: GraphName): Promise<Graph> {
  const { getCollection } = await import('astro:content');
  if (graph === 'setup') return setupGraph((await getCollection('setup')).map((e) => e.data));
  return turnGraph((await getCollection('turn')).map((e) => e.data));
}
