/**
 * Обратный индекс «зона поля → где используется» (SPEC 11.5.1).
 * Связь не пишется руками: она вычисляется из `zones` узлов wizard'ов при сборке.
 * Узел с подзоной попадает и в подзону, и в её родителя. FAQ добавится в R5.1.
 */
import { BOARD_ZONES } from '../data/board-zones';
import type { GraphName } from './wizard-engine';

export type ZoneIndexNode = {
  readonly id: string;
  readonly title: string;
  readonly zones?: readonly string[] | undefined;
};
export type ZoneUse = { graph: GraphName; id: string; title: string };
export type ZoneIndex = ReadonlyMap<string, readonly ZoneUse[]>;

export function buildZoneIndex(
  zones: readonly { readonly id: string; readonly parent?: string | undefined }[],
  graphs: Readonly<Record<GraphName, readonly ZoneIndexNode[]>>,
): ZoneIndex {
  const parentOf = new Map(zones.map((z) => [z.id, z.parent]));
  const index = new Map<string, ZoneUse[]>(zones.map((z) => [z.id, []]));
  for (const graph of ['setup', 'turn'] as const) {
    for (const node of graphs[graph]) {
      const targets = new Set<string>();
      for (const zone of node.zones ?? []) {
        if (!parentOf.has(zone))
          throw new Error(`zone-index: ${graph}: узел ${node.id}: неизвестная зона ${zone}`);
        targets.add(zone);
        const parent = parentOf.get(zone);
        if (parent !== undefined) targets.add(parent);
      }
      for (const zone of targets) index.get(zone)?.push({ graph, id: node.id, title: node.title });
    }
  }
  return index;
}

/** Индекс по коллекциям Astro. Вызывать только на этапе сборки (frontmatter страниц). */
export async function loadZoneIndex(): Promise<ZoneIndex> {
  const { getCollection } = await import('astro:content');
  const setup = (await getCollection('setup'))
    .map((e) => e.data)
    .toSorted((a, b) => a.order - b.order)
    .map((e) => e.node);
  const turn = (await getCollection('turn')).flatMap((e) => e.data.nodes);
  return buildZoneIndex(BOARD_ZONES, { setup, turn });
}
