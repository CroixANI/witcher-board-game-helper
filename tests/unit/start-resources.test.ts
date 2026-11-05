import { describe, expect, it } from 'vitest';
import { START_RESOURCES, startResources } from '../../src/data/start-resources';

// SPEC 7.1 = книга правил, стр. 8: [карты, золото] по местам хода.
const SPEC_7_1 = {
  2: [
    [3, 2],
    [5, 4],
  ],
  3: [
    [3, 2],
    [4, 4],
    [5, 6],
  ],
  4: [
    [2, 4],
    [3, 5],
    [4, 6],
    [5, 7],
  ],
  5: [
    [2, 5],
    [3, 5],
    [4, 5],
    [4, 7],
    [5, 7],
  ],
} as const;

describe('START_RESOURCES', () => {
  it('совпадает с таблицей SPEC 7.1 (стр. 8)', () => {
    for (const players of [2, 3, 4, 5] as const) {
      const actual = START_RESOURCES[players].map(({ cards, gold }) => [cards, gold]);
      expect(actual, `${players} игрока`).toEqual(SPEC_7_1[players]);
    }
  });

  it('мест ровно столько, сколько игроков', () => {
    for (const players of [2, 3, 4, 5] as const) {
      expect(START_RESOURCES[players]).toHaveLength(players);
    }
  });
});

describe('startResources', () => {
  it('крайние места при 2 и 5 игроках', () => {
    expect(startResources(2, 1)).toEqual({ cards: 3, gold: 2 });
    expect(startResources(2, 2)).toEqual({ cards: 5, gold: 4 });
    expect(startResources(5, 1)).toEqual({ cards: 2, gold: 5 });
    expect(startResources(5, 5)).toEqual({ cards: 5, gold: 7 });
  });

  it('места вне диапазона — ошибка', () => {
    expect(() => startResources(2, 3)).toThrow(RangeError);
    expect(() => startResources(4, 0)).toThrow(RangeError);
  });
});
