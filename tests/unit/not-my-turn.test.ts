// @vitest-environment happy-dom
// «Сейчас не мой ход»: фильтр ситуаций по числу игроков (SPEC 8.8, ROADMAP R3.4).
import { describe, expect, it } from 'vitest';
import { applyPlayersFilter, isHidden, playersAttr } from '../../src/lib/not-my-turn';
import { createSafeStorage, type SafeStorage } from '../../src/lib/safe-storage';
import { PARAMS_KEY } from '../../src/lib/wizard-engine';

function storageWith(value?: string): SafeStorage {
  const map = new Map<string, string>(value === undefined ? [] : [[PARAMS_KEY, value]]);
  return createSafeStorage(() => ({
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }));
}

/** Две ситуации: без условия и «ставка» (3–5 игроков). */
function situations() {
  const always = document.createElement('details');
  const bet = document.createElement('details');
  bet.setAttribute('data-players', playersAttr([3, 4, 5])!);
  return { always, bet, items: [always, bet] };
}

describe('playersAttr / isHidden', () => {
  it('условие → строка через пробел, без условия — undefined', () => {
    expect(playersAttr([3, 4, 5])).toBe('3 4 5');
    expect(playersAttr(undefined)).toBeUndefined();
  });

  it('скрывает, только если число игроков известно и не входит в условие', () => {
    expect(isHidden('3 4 5', 2)).toBe(true);
    expect(isHidden('3 4 5', 3)).toBe(false);
    expect(isHidden('3 4 5', 5)).toBe(false);
    expect(isHidden('3 4 5', undefined)).toBe(false);
    expect(isHidden(null, 2)).toBe(false);
    expect(isHidden('', 2)).toBe(false);
  });
});

describe('applyPlayersFilter', () => {
  it('2 игрока: ставка скрыта, остальное видно', () => {
    const { always, bet, items } = situations();
    expect(applyPlayersFilter(items, storageWith('{"players":2}'))).toBe(2);
    expect(bet.hidden).toBe(true);
    expect(always.hidden).toBe(false);
  });

  it('4 игрока: видно всё', () => {
    const { bet, items } = situations();
    expect(applyPlayersFilter(items, storageWith('{"players":4,"school":"cat"}'))).toBe(4);
    expect(bet.hidden).toBe(false);
  });

  it('параметров нет, они битые или хранилище недоступно — видно всё', () => {
    for (const storage of [
      storageWith(),
      storageWith('не json'),
      storageWith('{"players":9}'),
      createSafeStorage(() => {
        throw new Error('SecurityError');
      }),
    ]) {
      const { bet, items } = situations();
      expect(applyPlayersFilter(items, storage)).toBeUndefined();
      expect(bet.hidden).toBe(false);
    }
  });

  it('повторный вызов снимает прежнее скрытие', () => {
    const { bet, items } = situations();
    applyPlayersFilter(items, storageWith('{"players":2}'));
    applyPlayersFilter(items, storageWith('{"players":3}'));
    expect(bet.hidden).toBe(false);
  });
});
