import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLLECTIONS, validateContent } from '../../scripts/validate-content';

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

  it('неизвестная зона', () => {
    const { errors } = bad('unknown-zone');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('s01-board');
    expect(errors[0]).toContain('неизвестная зона z-nope');
  });

  it('несуществующая папка контента — пустой результат, а не исключение', () => {
    const result = validateContent({ contentDir: root('tests/fixtures/none'), svgDir });
    expect(result.errors).toEqual([]);
  });
});
