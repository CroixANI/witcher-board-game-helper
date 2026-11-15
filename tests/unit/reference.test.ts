import { describe, expect, it } from 'vitest';
import {
  componentCategory,
  formatCount,
  formatPages,
  groupRules,
  ruleGroupLabel,
  RULE_GROUPS,
} from '../../src/lib/reference';

describe('formatPages', () => {
  it('одна страница', () => {
    expect(formatPages(15)).toBe('стр. 15');
    expect(formatPages([15])).toBe('стр. 15');
  });

  it('список и диапазоны от трёх страниц', () => {
    expect(formatPages([4, 6, 16])).toBe('стр. 4, 6, 16');
    expect(formatPages([22, 23, 24])).toBe('стр. 22–24');
    expect(formatPages([10, 11])).toBe('стр. 10, 11');
    expect(formatPages([20, 21, 22, 27, 28])).toBe('стр. 20–22, 27, 28');
  });

  it('сортирует и убирает повторы', () => {
    expect(formatPages([35, 11, 11])).toBe('стр. 11, 35');
  });
});

describe('componentCategory', () => {
  it('карты, жетоны, прочее', () => {
    expect(componentCategory('card')).toBe('cards');
    expect(componentCategory('token')).toBe('tokens');
    expect(componentCategory('board')).toBe('other');
    expect(componentCategory('misc')).toBe('other');
  });
});

describe('formatCount', () => {
  it('общее количество', () => {
    expect(formatCount({ count: 90 })).toBe('90');
  });

  it('в наборе игрока', () => {
    expect(formatCount({ count: 10, perPlayer: true })).toBe('10 в каждом наборе игрока');
  });

  it('с пояснением', () => {
    expect(formatCount({ count: 10, countNote: '2 набора по 5' })).toBe('10 — 2 набора по 5');
  });
});

describe('groupRules', () => {
  const rule = (
    id: string,
    group: (typeof RULE_GROUPS)[number]['id'],
    page: number | number[],
  ) => ({
    id,
    data: { group, title: id, page },
  });

  it('порядок групп по RULE_GROUPS, пустые группы опущены', () => {
    const groups = groupRules([rule('b', 'battle', 20), rule('a', 'basics', 9)]);
    expect(groups.map((g) => g.id)).toEqual(['basics', 'battle']);
    expect(groups[0]!.label).toBe(ruleGroupLabel('basics'));
  });

  it('внутри группы — по первой странице, затем по заголовку', () => {
    const groups = groupRules([
      rule('z', 'phase1', 12),
      rule('y', 'phase1', [13, 35]),
      rule('x', 'phase1', [14, 12]),
    ]);
    expect(groups[0]!.rules.map((r) => r.id)).toEqual(['x', 'z', 'y']);
  });
});
