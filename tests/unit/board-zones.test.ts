import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOARD_VIEWBOX, BOARD_ZONES, ZONE_IDS } from '../../src/data/board-zones';

describe('BOARD_ZONES (SPEC 11.3)', () => {
  it('все 14 зон из таблицы, id уникальны', () => {
    expect(BOARD_ZONES).toHaveLength(14);
    expect(ZONE_IDS.size).toBe(BOARD_ZONES.length);
    for (const id of ['z-board', 'z-action-row', 'z-monster-slots', 'z-player-area']) {
      expect(ZONE_IDS.has(id), id).toBe(true);
    }
  });

  it('id в формате z-kebab-case', () => {
    for (const { id } of BOARD_ZONES) expect(id).toMatch(/^z-[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('каждая зона внутри viewBox 200×140 и не вырождена', () => {
    expect(BOARD_VIEWBOX).toEqual({ width: 200, height: 140 });
    for (const z of BOARD_ZONES) {
      expect(z.w, z.id).toBeGreaterThan(0);
      expect(z.h, z.id).toBeGreaterThan(0);
      expect(z.x + z.w, z.id).toBeLessThanOrEqual(BOARD_VIEWBOX.width);
      expect(z.y + z.h, z.id).toBeLessThanOrEqual(BOARD_VIEWBOX.height);
    }
  });

  it('координаты z-action-row по SPEC', () => {
    const row = BOARD_ZONES.find((z) => z.id === 'z-action-row');
    expect(row).toMatchObject({ x: 134, y: 13, w: 22, h: 85 });
  });
});

describe('board-schematic.svg (SPEC 11.2, 11.3)', () => {
  const path = 'src/assets/svg/board/board-schematic.svg';
  const svg = readFileSync(path, 'utf8');
  const groups = [...svg.matchAll(/<g id="([^"]+)"[^>]*>\s*<rect\b([^>]*)\/?>/g)];
  const frames = new Map(groups.map(([, id, attrs]) => [id, attrs ?? '']));
  // svgo убирает атрибуты со значением по умолчанию (x="0"), поэтому отсутствие = 0.
  const num = (attrs: string, name: string) =>
    Number(new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1] ?? 0);

  it('viewBox 0 0 200 140, ≤ 25 КБ, только векторы', () => {
    expect(svg).toMatch(/^<svg\b[^>]*\sviewBox="0 0 200 140"/);
    expect(statSync(path).size).toBeLessThanOrEqual(25 * 1024);
    expect(svg).not.toMatch(/<(image|script|foreignObject|style)\b|data:|href=|url\(/i);
  });

  it('каждый id из board-zones.ts есть в SVG и наоборот', () => {
    const svgIds = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(svgIds).size).toBe(svgIds.length);
    expect(svgIds.sort()).toEqual([...ZONE_IDS].sort());
  });

  it.each(BOARD_ZONES)('$id: первая <rect> группы — рамка зоны по координатам SPEC', (zone) => {
    const attrs = frames.get(zone.id);
    expect(attrs, zone.id).toBeDefined();
    const frame = {
      x: num(attrs ?? '', 'x'),
      y: num(attrs ?? '', 'y'),
      w: num(attrs ?? '', 'width'),
      h: num(attrs ?? '', 'height'),
    };
    expect(frame).toEqual({ x: zone.x, y: zone.y, w: zone.w, h: zone.h });
  });

  it('у ряда карт подписи «у колоды +1» и «дальняя −1» (стр. 19)', () => {
    const row = /<g id="z-action-row"[^>]*>([\s\S]*?)<g id="/.exec(svg)?.[1] ?? '';
    const texts = [...row.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    expect(texts).toEqual(['у колоды', '+1', '+1', 'дальняя', '−1']);
  });
});
