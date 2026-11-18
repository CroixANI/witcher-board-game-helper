// Подсказки цикла битвы с монстром (ROADMAP R4.1, SPEC 8.5): номер хода монстра и кто выбирает тип атаки.
// Книга, стр. 21: первым ходит ведьмак, если у него есть след монстра, иначе монстр.
// Стр. 25: в 1-й ход монстра атаку выбирает контролирующий (игрок справа), дальше право переходит
// против часовой стрелки, пропуская активного игрока.
import { describe, expect, it } from 'vitest';
import { attackChooser, monsterTurnNumber } from '../../src/lib/monster-battle';

describe('monsterTurnNumber', () => {
  it('монстр ходит первым: ходы битвы 1, 3, 5 — ходы монстра 1, 2, 3', () => {
    expect([1, 3, 5].map((t) => monsterTurnNumber(t, false))).toEqual([1, 2, 3]);
  });

  it('ведьмак ходит первым (есть след): ходы битвы 2, 4, 6 — ходы монстра 1, 2, 3', () => {
    expect([2, 4, 6].map((t) => monsterTurnNumber(t, true))).toEqual([1, 2, 3]);
  });

  it('никогда не меньше 1', () => {
    expect(monsterTurnNumber(0, true)).toBe(1);
    expect(monsterTurnNumber(1, true)).toBe(1);
  });
});

describe('attackChooser', () => {
  it('2 игрока: всегда соперник', () => {
    for (const m of [1, 2, 3, 7]) expect(attackChooser(2, m)).toMatch(/соперник/);
  });

  it('1-й ход монстра при любом числе игроков — игрок справа, он контролирует монстра', () => {
    for (const n of [3, 4, 5] as const) {
      expect(attackChooser(n, 1)).toMatch(/игрок справа от вас/);
      expect(attackChooser(n, 1)).toMatch(/контролирует/);
    }
  });

  it('3 игрока: справа, слева, снова справа', () => {
    expect([1, 2, 3, 4].map((m) => attackChooser(3, m))).toEqual([
      expect.stringMatching(/справа/),
      expect.stringMatching(/слева/),
      expect.stringMatching(/справа/),
      expect.stringMatching(/слева/),
    ]);
  });

  it('4 игрока: справа → 2-й справа → слева → снова справа', () => {
    expect(attackChooser(4, 2)).toMatch(/2-й игрок справа/);
    expect(attackChooser(4, 3)).toMatch(/игрок слева/);
    expect(attackChooser(4, 4)).toMatch(/игрок справа от вас/);
  });

  it('5 игроков: право обходит всех четырёх соперников по кругу', () => {
    expect(attackChooser(5, 2)).toMatch(/2-й игрок справа/);
    expect(attackChooser(5, 3)).toMatch(/3-й игрок справа/);
    expect(attackChooser(5, 4)).toMatch(/игрок слева/);
    expect(attackChooser(5, 5)).toMatch(/игрок справа от вас/);
  });

  it('вы (активный игрок) не выбираете никогда', () => {
    for (const n of [2, 3, 4, 5] as const)
      for (let m = 1; m <= 12; m++) expect(attackChooser(n, m)).not.toMatch(/выбираете вы/);
  });

  it('число игроков неизвестно — общее правило', () => {
    expect(attackChooser(undefined, 2)).toMatch(/против часовой/);
  });
});
