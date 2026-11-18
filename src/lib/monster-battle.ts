/**
 * Подсказки цикла битвы с монстром (SPEC 8.5, `bm-monster-turn`). Чистые функции без UI.
 * Стр. 21: первым ходит ведьмак, если у него есть жетон следа монстра, иначе монстр.
 * Стр. 25: в 1-й ход монстра тип атаки выбирает контролирующий (игрок справа от активного),
 * дальше право переходит против часовой стрелки, пропуская активного игрока.
 */
import type { PlayerCount } from './wizard-engine';

/** Номер хода монстра (с 1) по номеру хода битвы (с 1): ходы ведьмака и монстра чередуются. */
export function monsterTurnNumber(battleTurn: number, witcherFirst: boolean): number {
  return Math.max(1, Math.floor((battleTurn + (witcherFirst ? 0 : 1)) / 2));
}

/** Кто объявляет тип атаки (удар или укус) в этот ход монстра. */
export function attackChooser(players: PlayerCount | undefined, monsterTurn: number): string {
  const lead = 'Тип атаки выбирает';
  if (players === undefined)
    return `${lead}: в 1-й ход монстра — игрок справа от вас (контролирует монстра), дальше право переходит против часовой стрелки, минуя вас`;
  if (players === 2) return `${lead} соперник: при игре вдвоём — всегда он`;
  // k-й игрок справа от активного: право обходит n − 1 соперников по кругу.
  const k = ((monsterTurn - 1) % (players - 1)) + 1;
  if (k === 1) return `${lead} игрок справа от вас — он контролирует монстра`;
  if (k === players - 1) return `${lead} игрок слева от вас`;
  return `${lead} ${k}-й игрок справа от вас`;
}
