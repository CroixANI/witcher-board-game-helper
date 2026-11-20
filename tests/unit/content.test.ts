import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLLECTIONS, validateContent } from '../../scripts/validate-content';
import { BOARD_ZONES } from '../../src/data/board-zones';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const svgDir = root('src/assets/svg');
const bad = (name: string) =>
  validateContent({ contentDir: root(`tests/fixtures/bad/${name}`), svgDir });

describe('validate-content: реальный контент', () => {
  const result = validateContent({ contentDir: root('src/content'), svgDir });

  it('без ошибок', () => {
    expect(result.errors).toEqual([]);
  });

  it('в каждой коллекции есть хотя бы один пример', () => {
    for (const name of Object.keys(COLLECTIONS) as (keyof typeof COLLECTIONS)[]) {
      expect(result.counts[name], name).toBeGreaterThan(0);
    }
  });
});

describe('validate-content: битые фикстуры (tests/fixtures/bad)', () => {
  it('узел без pages', () => {
    const { errors } = bad('node-without-pages');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('setup/s01-board.md');
    expect(errors[0]).toContain('node.pages: обязательное поле не указано');
  });

  it('next на несуществующий id', () => {
    const { errors } = bad('next-missing');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('s01-board');
    expect(errors[0]).toContain('несуществующий узел s99-nope');
  });

  it('rules: [nope]', () => {
    const { errors } = bad('rules-nope');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('setup/s01-board.md');
    expect(errors[0]).toContain('node.rules.0');
    expect(errors[0]).toContain('rules/nope');
  });

  it('FAQ source: rulebook без page', () => {
    const { errors } = bad('faq-rulebook-no-page');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('faq/no-page.md');
    expect(errors[0]).toContain('rulebook → нужен page');
  });

  it('FAQ: неизвестная зона в zones', () => {
    const { errors } = bad('faq-unknown-zone');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('faq/bad-zone.md');
    expect(errors[0]).toContain('zones.0: неизвестная зона z-nope');
  });

  it('неизвестная зона', () => {
    const { errors } = bad('unknown-zone');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('s01-board');
    expect(errors[0]).toContain('неизвестная зона z-nope');
  });

  it('usedIn компонента на несуществующий узел', () => {
    const { errors } = bad('used-in-missing');
    expect(errors).toEqual(['components/wilds.yaml: usedIn: несуществующий узел s99-nope']);
  });

  it('нет файла иконки у компонента и у действия локации', () => {
    const { errors } = bad('icon-missing');
    expect(errors).toEqual([
      'components/wilds.yaml: нет файла иконки src/assets/svg/components/no-such-icon.svg',
      'location-actions/training.yaml: нет файла иконки src/assets/svg/actions/no-such-action.svg',
    ]);
  });

  it('иконки вариантов и пунктов чек-листа без файла; неизвестное действие локации', () => {
    expect(bad('node-icons').errors).toEqual([
      'turn: узел b: неизвестное действие локации no-such-action',
      'turn/start.yaml: нет файла иконки src/assets/svg/actions/no-such-move.svg',
      'turn/start.yaml: нет файла иконки src/assets/svg/icons/no-such-icon.svg',
    ]);
  });

  it('тупик и сирота в графе (инварианты 2, 3)', () => {
    expect(bad('dead-end').errors).toEqual([
      'setup: узел s12-summary недостижим из entry',
      'setup: узел s01-board: при 2, 3, 4, 5 игроках из него не дойти до end',
      'setup: узел s02-loop: при 2, 3, 4, 5 игроках из него не дойти до end',
    ]);
  });

  it('лишний файл зоны; при непустой коллекции zones нужны файлы всех зон (инвариант 7б)', () => {
    const { errors } = bad('zone-extra-file');
    expect(errors).toContain('zones/z-nope.yaml: зоны z-nope нет в src/data/board-zones.ts');
    expect(errors.filter((e) => e.startsWith('zones: нет файла'))).toHaveLength(BOARD_ZONES.length);
  });

  it('компонент не лежит ни в одной зоне (инвариант 7в)', () => {
    const { errors } = bad('component-without-zone');
    expect(errors).toContain(
      'components/gold.yaml: компонент не лежит ни в одной зоне (src/content/zones/*.yaml)',
    );
  });

  it('подзона с неизвестным parent в board-zones (инвариант 7б)', () => {
    const boardZones = [
      ...BOARD_ZONES,
      { id: 'z-orphan', label: 'Сирота', x: 0, y: 0, w: 1, h: 1, steps: '—', parent: 'z-nope' },
    ];
    const { errors } = validateContent({
      contentDir: root('tests/fixtures/none'),
      svgDir,
      boardZones,
    });
    expect(errors).toEqual(['board-zones: зона z-orphan: неизвестный parent z-nope']);
  });

  it('несуществующая папка контента — пустой результат, а не исключение', () => {
    const result = validateContent({ contentDir: root('tests/fixtures/none'), svgDir });
    expect(result.errors).toEqual([]);
  });
});
