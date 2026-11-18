// Контент «Не забудь» (SPEC 8.9) и «Сейчас не мой ход» (SPEC 8.8), ROADMAP R3.4.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const dir = (p: string) => fileURLToPath(new URL(`../../src/content/${p}`, import.meta.url));
const files = (p: string, ext: string) =>
  readdirSync(dir(p))
    .filter((f) => f.endsWith(ext))
    .map((f) => ({ id: f.slice(0, -ext.length), text: readFileSync(`${dir(p)}/${f}`, 'utf8') }));

const reminders = files('reminders', '.yaml').map(({ id, text }) => ({
  id,
  data: parseYaml(text) as { order: number; rule: string; text: string },
}));
const situations = files('not-my-turn', '.md').map(({ id, text }) => {
  const [, front = '', body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text) ?? [];
  return {
    id,
    body,
    data: parseYaml(front) as { order: number; showIf?: { players?: number[] } },
  };
});

describe('«Не забудь»', () => {
  it('12 пунктов SPEC 8.9 в заданном порядке, order уникальны', () => {
    const ordered = reminders.toSorted((a, b) => a.data.order - b.data.order).map((r) => r.id);
    expect(ordered).toEqual([
      'hand-limit',
      'elixir-limit',
      'defense-up',
      'alchemy-up',
      'witcher-level',
      'skill-max',
      'shield-cap',
      'deck-empty',
      'remove-from-game',
      'trail-one-per-terrain',
      'last-trophy',
      'golden-rule',
    ]);
    expect(new Set(reminders.map((r) => r.data.order)).size).toBe(12);
  });
});

describe('«Сейчас не мой ход»', () => {
  const byId = new Map(situations.map((s) => [s.id, s]));

  it('9 ситуаций SPEC 8.8 в заданном порядке', () => {
    expect(situations.toSorted((a, b) => a.data.order - b.data.order).map((s) => s.id)).toEqual([
      'read-exploration',
      'read-event',
      'control-monster',
      'choose-attack',
      'place-bet',
      'poker-witcher',
      'poker-town',
      'defend',
      'look-at-deck',
    ]);
  });

  it('ставка — только при 3–5 игроках, остальное — всегда', () => {
    expect(byId.get('place-bet')!.data.showIf).toEqual({ players: [3, 4, 5] });
    for (const s of situations.filter((x) => x.id !== 'place-bet'))
      expect(s.data.showIf, s.id).toBeUndefined();
  });

  it('место на столе — ссылками zone: (SPEC 11.5.2)', () => {
    const zones = (id: string) =>
      [...byId.get(id)!.body.matchAll(/\]\(zone:([a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(zones('read-exploration')).toEqual(['z-exploration-city', 'z-exploration-wilds']);
    expect(zones('read-event')).toEqual(['z-event-deck']);
    expect(zones('control-monster')).toEqual(['z-monster-battle-deck']);
    expect(zones('defend')).toEqual(['z-action-row']);
    for (const id of ['place-bet', 'poker-witcher', 'poker-town'])
      expect(zones(id), id).toEqual(['z-supply']);
  });
});
