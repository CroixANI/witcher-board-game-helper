/**
 * Инварианты графов wizard'ов (SPEC 13.2). Пока реализованы проверки 1, 5 и 7;
 * достижимость и тупики (2–4, 6) появятся вместе с движком.
 * Функции чистые: возвращают список ошибок, пустой — всё в порядке.
 */

/** Минимальная структура узла, нужная проверкам (совместима с узлами из content-schemas). */
export type GraphNode = {
  readonly id: string;
  readonly pages?: number | readonly number[] | undefined;
  readonly rules?: readonly string[] | undefined;
  readonly zones?: readonly string[] | undefined;
  readonly checklist?: readonly { readonly rule?: string | undefined }[] | undefined;
  readonly next?: string | readonly { readonly to: string }[] | undefined;
  readonly options?: readonly { readonly next: string }[] | undefined;
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
