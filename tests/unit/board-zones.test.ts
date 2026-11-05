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
