/**
 * Страница поля `/board/` (SPEC 11.5.3): порядок карточек зон и CSS подсветки.
 * Чистые функции без Astro — их проверяют unit-тесты.
 */
import type { ZoneIndex } from './zone-index';

type ZoneLike = { readonly id: string; readonly parent?: string | undefined };

export type ZoneTree<Z extends ZoneLike> = { zone: Z; children: Z[] };

/**
 * Зоны верхнего уровня в порядке подготовки: по первому шагу setup, где зона (или её подзона)
 * используется. Зоны без шагов подготовки — в конце, в исходном порядке. Подзоны вложены
 * в родителя в исходном порядке.
 */
export function orderBoardZones<Z extends ZoneLike>(
  zones: readonly Z[],
  index: ZoneIndex,
  setupOrder: readonly string[],
): ZoneTree<Z>[] {
  const position = new Map(setupOrder.map((id, i) => [id, i]));
  const firstSetup = (id: string): number =>
    Math.min(
      ...(index.get(id) ?? [])
        .filter((use) => use.graph === 'setup')
        .map((use) => position.get(use.id) ?? Infinity),
    );
  return zones
    .filter((z) => z.parent === undefined)
    .map((zone, i) => ({
      tree: { zone, children: zones.filter((c) => c.parent === zone.id) },
      key: firstSetup(zone.id),
      i,
    }))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map(({ tree }) => tree);
}

/** Выделение карточки текущей зоны. */
const CURRENT_CARD =
  'background: var(--color-surface-raised); border-left-color: var(--color-accent-light);';

/**
 * CSS подсветки зоны на схеме `/board/`, по правилу на зону: без JS — по `:target`,
 * с JS — по `data-current` острова `BoardPage`. После `history.replaceState` `:target`
 * остаётся старым, поэтому при `data-current` правила `:target` выключены.
 */
export function zoneHighlightCss(ids: readonly string[]): string {
  return ids
    .map((id) => {
      const scopes = [
        `.board-page:not([data-current]):has(#${id}:target)`,
        `.board-page[data-current="${id}"]`,
      ];
      const select = (inner: string) => scopes.map((s) => `${s} ${inner}`).join(', ');
      return [
        `${select(`[data-highlight="${id}"]`)} { display: inline; }`,
        `${select(`#${id} > .zone-card__head`)} { ${CURRENT_CARD} }`,
      ].join('\n');
    })
    .join('\n');
}
