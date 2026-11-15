// Обратный индекс «зона → узлы wizard'ов» (SPEC 11.5.1, ROADMAP R2.7).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { BOARD_ZONES } from '../../src/data/board-zones';
import { buildZoneIndex, type ZoneIndexNode } from '../../src/lib/zone-index';

const ZONES = [
  { id: 'z-row' },
  { id: 'z-row-plus1', parent: 'z-row' },
  { id: 'z-row-minus1', parent: 'z-row' },
  { id: 'z-supply' },
];
const node = (id: string, zones?: string[]): ZoneIndexNode => ({
  id,
  title: `Узел ${id}`,
  ...(zones === undefined ? {} : { zones }),
});

describe('buildZoneIndex', () => {
  it('ключ на каждую зону, даже без узлов', () => {
    const index = buildZoneIndex(ZONES, { setup: [], turn: [] });
    expect([...index.keys()]).toEqual(['z-row', 'z-row-plus1', 'z-row-minus1', 'z-supply']);
    for (const uses of index.values()) expect(uses).toEqual([]);
  });

  it('узел попадает в свою зону; setup раньше turn, порядок узлов сохранён', () => {
    const index = buildZoneIndex(ZONES, {
      setup: [node('s06', ['z-supply']), node('s01')],
      turn: [node('t1', ['z-supply'])],
    });
    expect(index.get('z-supply')).toEqual([
      { graph: 'setup', id: 's06', title: 'Узел s06' },
      { graph: 'turn', id: 't1', title: 'Узел t1' },
    ]);
  });

  it('узел с подзоной попадает и в подзону, и в родителя; родитель не попадает в подзону', () => {
    const index = buildZoneIndex(ZONES, {
      setup: [node('s02', ['z-row'])],
      turn: [node('p3-buy', ['z-row-minus1'])],
    });
    expect(index.get('z-row')?.map((u) => u.id)).toEqual(['s02', 'p3-buy']);
    expect(index.get('z-row-minus1')?.map((u) => u.id)).toEqual(['p3-buy']);
    expect(index.get('z-row-plus1')).toEqual([]);
  });

  it('узел, указавший и родителя, и подзону, в родителе один раз', () => {
    const index = buildZoneIndex(ZONES, {
      setup: [],
      turn: [node('p3', ['z-row-plus1', 'z-row', 'z-row-minus1'])],
    });
    expect(index.get('z-row')?.map((u) => u.id)).toEqual(['p3']);
    expect(index.get('z-row-plus1')?.map((u) => u.id)).toEqual(['p3']);
  });

  it('неизвестная зона в узле — понятная ошибка', () => {
    expect(() => buildZoneIndex(ZONES, { setup: [node('s1', ['z-nope'])], turn: [] })).toThrow(
      /узел s1: неизвестная зона z-nope/,
    );
  });
});

describe('buildZoneIndex на реальном контенте подготовки', () => {
  const dir = fileURLToPath(new URL('../../src/content/setup', import.meta.url));
  const setup = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(`${dir}/${f}`, 'utf8');
      const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
      return parseYaml(front) as { order: number; node: ZoneIndexNode };
    })
    .toSorted((a, b) => a.order - b.order)
    .map((e) => e.node);
  const index = buildZoneIndex(BOARD_ZONES, { setup, turn: [] });

  it('ряд карт и его подзоны: s02 в родителе, подзоны пока пусты', () => {
    expect(index.get('z-action-row')?.map((u) => u.id)).toEqual(['s02-action-row']);
    expect(index.get('z-action-row-minus1')).toEqual([]);
  });

  it('у каждой зоны первого уровня есть хотя бы один шаг подготовки', () => {
    const empty = BOARD_ZONES.filter((z) => !z.parent && !index.get(z.id)?.length).map((z) => z.id);
    expect(empty).toEqual([]);
  });
});
