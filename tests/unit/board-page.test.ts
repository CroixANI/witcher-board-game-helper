// Порядок карточек и CSS подсветки страницы поля (SPEC 11.5.3, ROADMAP R2.9).
import { describe, expect, it } from 'vitest';
import { BOARD_ZONES } from '../../src/data/board-zones';
import { orderBoardZones, zoneHighlightCss } from '../../src/lib/board-page';
import { buildZoneIndex } from '../../src/lib/zone-index';

const ZONES = [
  { id: 'z-map' },
  { id: 'z-row' },
  { id: 'z-row-plus1', parent: 'z-row' },
  { id: 'z-row-minus1', parent: 'z-row' },
  { id: 'z-supply' },
  { id: 'z-player' },
];
const node = (id: string, zones: string[]) => ({ id, title: id, zones });

describe('orderBoardZones', () => {
  const index = buildZoneIndex(ZONES, {
    setup: [node('s01', ['z-supply']), node('s02', ['z-row-minus1']), node('s03', ['z-map'])],
    turn: [node('t1', ['z-player'])],
  });
  const tree = orderBoardZones(ZONES, index, ['s01', 's02', 's03']);

  it('верхний уровень — по первому шагу подготовки; без шагов подготовки — в конце', () => {
    expect(tree.map((t) => t.zone.id)).toEqual(['z-supply', 'z-row', 'z-map', 'z-player']);
  });

  it('подзоны вложены в родителя в исходном порядке; родителя поднимает шаг подзоны', () => {
    expect(tree.find((t) => t.zone.id === 'z-row')?.children.map((c) => c.id)).toEqual([
      'z-row-plus1',
      'z-row-minus1',
    ]);
    expect(tree.find((t) => t.zone.id === 'z-supply')?.children).toEqual([]);
  });

  it('шаг хода не влияет на порядок; зоны без шагов сохраняют исходный порядок', () => {
    const empty = buildZoneIndex(ZONES, { setup: [], turn: [node('t1', ['z-player'])] });
    expect(orderBoardZones(ZONES, empty, []).map((t) => t.zone.id)).toEqual([
      'z-map',
      'z-row',
      'z-supply',
      'z-player',
    ]);
  });

  it('реальные зоны: каждая ровно один раз, подзоны внутри родителей', () => {
    const real = orderBoardZones(
      BOARD_ZONES,
      buildZoneIndex(BOARD_ZONES, { setup: [], turn: [] }),
      [],
    );
    const flat = real.flatMap((t) => [t.zone.id, ...t.children.map((c) => c.id)]);
    expect(flat.toSorted()).toEqual(BOARD_ZONES.map((z) => z.id).toSorted());
    for (const t of real) for (const c of t.children) expect(c.parent).toBe(t.zone.id);
  });
});

describe('zoneHighlightCss', () => {
  const css = zoneHighlightCss(['z-row', 'z-row-minus1']);

  it('без JS — :target, пока остров не выставил data-current', () => {
    expect(css).toContain(
      '.board-page:not([data-current]):has(#z-row-minus1:target) [data-highlight="z-row-minus1"]',
    );
  });

  it('с JS — data-current; подсвечивается только своя зона, не родитель', () => {
    expect(css).toContain('.board-page[data-current="z-row"] [data-highlight="z-row"]');
    expect(css).not.toContain('[data-current="z-row-minus1"] [data-highlight="z-row"]');
    expect(css).toContain('.board-page[data-current="z-row"] #z-row > .zone-card__head');
  });

  it('по два правила на зону', () => {
    expect(css.split('\n')).toHaveLength(4);
    expect(zoneHighlightCss([])).toBe('');
  });
});
