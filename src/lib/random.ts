/** Заполняет буфер случайными 32-битными значениями (по умолчанию — `crypto.getRandomValues`). */
export type FillRandom = (buf: Uint32Array) => Uint32Array;

const RANGE = 2 ** 32;
const cryptoFill: FillRandom = (buf) => crypto.getRandomValues(buf);

/**
 * Равновероятное целое 0…n−1. Значения из «хвоста» выше наибольшего кратного n отбрасываются,
 * поэтому остаток от деления не смещён к малым числам.
 */
export function randomInt(n: number, fill: FillRandom = cryptoFill): number {
  if (!Number.isInteger(n) || n < 1 || n > RANGE) throw new RangeError(`randomInt: n = ${n}`);
  const limit = RANGE - (RANGE % n);
  const buf = new Uint32Array(1);
  for (;;) {
    const x = fill(buf)[0]!;
    if (x < limit) return x % n;
  }
}
