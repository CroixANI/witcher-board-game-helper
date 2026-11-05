import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { Icon } from '../../src/islands/Icon';
import { defaultIconLabel, iconLabel, iconNames, renderIcon, withA11y } from '../../src/lib/icons';

const SVG_DIR = 'src/assets/svg';
const MAX_BYTES = 3 * 1024; // SPEC 11.2: ≤ 3 КБ на иконку после svgo

// SPEC 9.2, колонка «Иконка» — 23 компонента.
const COMPONENTS = [
  'board',
  'card-back-action',
  'card-starter',
  'card-back-elixir',
  'card-back-exploration-city',
  'card-back-exploration-wilds',
  'card-back-event',
  'card-back-skill-trophy',
  'card-reference',
  'card-monster',
  'card-back-monster-battle',
  'card-witcher-trophy',
  'token-location',
  'token-monster',
  'token-trail',
  'token-gold',
  'token-tavern',
  'dice',
  'player-board',
  'token-trophy',
  'figure',
  'cube',
  'shield-marker',
];

// SPEC 11.2: 4 способа перемещения + 7 действий локаций.
const ACTIONS = [
  'move-terrain',
  'move-two-cards',
  'move-card-gold',
  'move-joker',
  'loc-skill-raise',
  'loc-poker-town',
  'loc-card-swap',
  'loc-elixir',
  'loc-school-training',
  'loc-hunt',
  'loc-gold-row',
];

// SPEC 11.2 и 9.3: 3 местности, 4 навыка, удар/укус, 5 абстрактных эмблем школ.
const ICONS = [
  'terrain-forest',
  'terrain-mountain',
  'terrain-water',
  'skill-combat',
  'skill-defense',
  'skill-alchemy',
  'skill-specialization',
  'attack-strike',
  'attack-bite',
  ...['viper', 'bear', 'cat', 'wolf', 'griffin'].map((school) => `school-${school}`),
];

const EXPECTED = {
  components: COMPONENTS,
  actions: ACTIONS,
  icons: ICONS,
} as const;

const svgFiles = Object.keys(EXPECTED).flatMap((dir) =>
  readdirSync(join(SVG_DIR, dir))
    .filter((file) => file.endsWith('.svg'))
    .map((file) => ({ dir, file, path: join(SVG_DIR, dir, file) })),
);

describe('набор SVG (SPEC 9.2, 11.2)', () => {
  it.each(Object.entries(EXPECTED))('%s: ровно файлы из SPEC', (dir, names) => {
    const actual = svgFiles.filter((f) => f.dir === dir).map((f) => f.file);
    expect(actual.sort()).toEqual(names.map((name) => `${name}.svg`).sort());
  });

  it('всего 48 иконок, реестр видит каждую', () => {
    expect(svgFiles).toHaveLength(48);
    expect(iconNames).toEqual(svgFiles.map((f) => `${f.dir}/${f.file.slice(0, -4)}`).sort());
  });
});

describe.each(svgFiles)('$dir/$file', ({ dir, path }) => {
  const svg = readFileSync(path, 'utf8');

  it('≤ 3 КБ, есть viewBox и подпись', () => {
    expect(statSync(path).size).toBeLessThanOrEqual(MAX_BYTES);
    expect(svg).toMatch(/^<svg\b[^>]*\sviewBox="0 0 \d+ \d+"/);
    expect(defaultIconLabel(svg)).toBeTruthy();
  });

  it('только векторы: без растра, внешних ссылок и скриптов', () => {
    expect(svg).not.toMatch(/<(image|script|foreignObject|style)\b|data:|href=|url\(/i);
  });

  if (dir !== 'components') {
    // Пиктограммы монохромные — наследуют цвет темы. Цветные рубашки допустимы только у компонентов.
    it('цвет только currentColor', () => {
      const colors = [...svg.matchAll(/\s(?:fill|stroke)="([^"]*)"/g)].map((m) => m[1]);
      expect(colors.filter((c) => c !== 'currentColor' && c !== 'none')).toEqual([]);
    });
  }
});

describe('withA11y', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" aria-label="Золото" viewBox="0 0 24 24"><path d="M0 0"/></svg>';

  it('по умолчанию — role="img" и подпись из файла, без дублей атрибута', () => {
    const out = withA11y(svg);
    expect(out).toMatch(/^<svg role="img" aria-label="Золото" xmlns/);
    expect(out.match(/aria-label=/g)).toHaveLength(1);
  });

  it('label заменяет подпись и экранируется', () => {
    expect(withA11y(svg, { label: 'Монета "1" <x>' })).toContain(
      'aria-label="Монета &quot;1&quot; &lt;x&gt;"',
    );
  });

  it('decorative и иконка без подписи скрываются от скринридеров', () => {
    const hidden = '<svg aria-hidden="true" focusable="false" xmlns';
    expect(withA11y(svg, { decorative: true })).toMatch(new RegExp(`^${hidden}`));
    expect(withA11y(svg, { decorative: true })).not.toContain('aria-label');
    expect(withA11y('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toMatch(
      new RegExp(`^${hidden}`),
    );
  });

  it('не трогает вложенные элементы', () => {
    const nested = '<svg aria-label="A"><g aria-label="B"/></svg>';
    expect(withA11y(nested, { decorative: true })).toBe(
      '<svg aria-hidden="true" focusable="false"><g aria-label="B"/></svg>',
    );
  });

  it('без корневого <svg> — ошибка', () => {
    expect(() => withA11y('<div/>')).toThrow(/корневого <svg>/);
  });
});

describe('renderIcon / iconLabel', () => {
  it('рендерит иконку по имени с подписью из файла', () => {
    expect(renderIcon('components/token-gold')).toMatch(
      /^<svg role="img" aria-label="Золотая монета"/,
    );
    expect(iconLabel('icons/terrain-forest')).toBe('Местность: лес');
  });

  it('неизвестное имя — понятная ошибка', () => {
    expect(() => renderIcon('components/nope')).toThrow(/нет иконки «components\/nope»/);
    expect(iconLabel('components/nope')).toBeUndefined();
  });
});

describe('Preact <Icon>', () => {
  it('inline SVG в обёртке .icon с размером', () => {
    const html = renderToString(
      h(Icon, { name: 'icons/skill-alchemy', size: '2rem', class: 'big', decorative: true }),
    );
    expect(html).toMatch(
      /^<span class="icon big" style="--icon-size: ?2rem;?"><svg aria-hidden="true"/,
    );
  });

  it('по умолчанию 1.5em и доступная подпись', () => {
    const html = renderToString(h(Icon, { name: 'icons/skill-alchemy', label: 'Алхимия' }));
    expect(html).toMatch(/--icon-size: ?1.5em/);
    expect(html).toContain('role="img" aria-label="Алхимия"');
  });
});
