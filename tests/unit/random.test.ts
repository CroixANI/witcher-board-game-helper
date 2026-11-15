import { describe, expect, it } from 'vitest';
import { randomInt } from '../../src/lib/random';

/** Источник случайности, отдающий заранее заданные 32-битные значения по очереди. */
function sequence(...values: number[]) {
  let calls = 0;
  const fill = (buf: Uint32Array) => {
    buf[0] = values[calls++] ?? 0;
    return buf;
  };
  return { fill, calls: () => calls };
}

describe('randomInt', () => {
  it('значение источника приводится к диапазону 0…n−1', () => {
    expect(randomInt(4, sequence(0).fill)).toBe(0);
    expect(randomInt(4, sequence(7).fill)).toBe(3);
    expect(randomInt(5, sequence(12).fill)).toBe(2);
  });

  it('без смещения: «хвост» выше кратного n отбрасывается и запрашивается новое значение', () => {
    // 2^32 = 858993459·5 + 1 → единственное отбрасываемое значение — 2^32 − 1.
    const src = sequence(2 ** 32 - 1, 9);
    expect(randomInt(5, src.fill)).toBe(4);
    expect(src.calls()).toBe(2);
  });

  it('n = 1 всегда даёт 0', () => {
    expect(randomInt(1, sequence(2 ** 32 - 1).fill)).toBe(0);
  });

  it('некорректное n — ошибка', () => {
    expect(() => randomInt(0)).toThrow(RangeError);
    expect(() => randomInt(2.5)).toThrow(RangeError);
    expect(() => randomInt(-3)).toThrow(RangeError);
  });

  it('по умолчанию — crypto.getRandomValues, результат в диапазоне', () => {
    for (let i = 0; i < 200; i++) {
      const x = randomInt(5);
      expect(Number.isInteger(x) && x >= 0 && x < 5).toBe(true);
    }
  });
});
