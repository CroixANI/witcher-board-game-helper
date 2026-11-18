/**
 * «Сейчас не мой ход» (SPEC 8.8; ROADMAP R3.4): какие ситуации скрыть при известном числе игроков.
 * Страница без JS показывает всё; клиентский скрипт прячет лишнее по `twow:v1:params`.
 */
import type { SafeStorage } from './safe-storage';
import { loadParams, type PlayerCount } from './wizard-engine';

/** Атрибут ситуации со списком чисел игроков из `showIf.players` («3 4 5»). */
export const PLAYERS_ATTR = 'data-players';

/** Значение атрибута для `showIf.players`; без условия — `undefined` (ситуация видна всегда). */
export function playersAttr(players: readonly number[] | undefined): string | undefined {
  return players?.join(' ');
}

/** Скрыть ситуацию? Только если число игроков известно и не входит в условие. */
export function isHidden(attr: string | null | undefined, players: PlayerCount | undefined) {
  if (!attr || players === undefined) return false;
  return !attr.split(' ').map(Number).includes(players);
}

/**
 * Спрятать ситуации, которые не подходят к числу игроков из хранилища.
 * Возвращает число игроков, если оно известно (для подписи на странице).
 */
export function applyPlayersFilter(
  items: Iterable<HTMLElement>,
  storage: SafeStorage,
): PlayerCount | undefined {
  const players = loadParams(storage)?.players;
  for (const item of items) item.hidden = isHidden(item.getAttribute(PLAYERS_ATTR), players);
  return players;
}
