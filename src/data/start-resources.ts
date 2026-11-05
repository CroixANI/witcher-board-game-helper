/** Стартовые ресурсы по месту хода (SPEC 7.1, книга правил стр. 8). Данные для вычислений, не контент. */
export type PlayerCount = 2 | 3 | 4 | 5;
export type StartResources = { readonly cards: number; readonly gold: number };

const r = (cards: number, gold: number): StartResources => ({ cards, gold });

/** Индекс массива = место хода − 1. Карты берутся из своей колоды и становятся рукой. */
export const START_RESOURCES: Readonly<Record<PlayerCount, readonly StartResources[]>> = {
  2: [r(3, 2), r(5, 4)],
  3: [r(3, 2), r(4, 4), r(5, 6)],
  4: [r(2, 4), r(3, 5), r(4, 6), r(5, 7)],
  5: [r(2, 5), r(3, 5), r(4, 5), r(4, 7), r(5, 7)],
};

/** Ресурсы игрока, который ходит `seat`-м (1 — первый игрок). */
export function startResources(players: PlayerCount, seat: number): StartResources {
  const res = START_RESOURCES[players][seat - 1];
  if (!res) throw new RangeError(`Место ${seat} невозможно при ${players} игроках`);
  return res;
}
