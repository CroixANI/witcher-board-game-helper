// Ссылки `zone:` в Markdown (SPEC 11.5.2, ROADMAP R2.8).
import { fileURLToPath, pathToFileURL } from 'node:url';
import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vitest';
import { validateContent } from '../../scripts/validate-content';
import { findZoneLinks, zoneLinksPlugin } from '../../src/lib/zone-links';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const BASE = '/witcher-board-game-helper';
const ZONES = new Set(['z-row', 'z-row-minus1']);

function render(md: string, fileURL?: URL) {
  const plugin = zoneLinksPlugin({ base: BASE, zoneIds: ZONES });
  const { html } = markdownToHtml(md, {
    mdastPlugins: [plugin],
    ...(fileURL && { fileURL }),
  });
  return html;
}

describe('zoneLinksPlugin', () => {
  it('zone:<id> → ссылка на /board/#<id> с base path, class и data-zone', () => {
    expect(render('Смотрите [ряд карт](zone:z-row).')).toBe(
      `<p>Смотрите <a href="${BASE}/board/#z-row" class="zone-link" data-zone="z-row">ряд карт</a>.</p>\n`,
    );
  });

  it('подзона работает так же', () => {
    const html = render('[ячейка −1](zone:z-row-minus1)');
    expect(html).toContain(`href="${BASE}/board/#z-row-minus1"`);
    expect(html).toContain('data-zone="z-row-minus1"');
  });

  it('base со слешем на конце не даёт двойного слеша', () => {
    const plugin = zoneLinksPlugin({ base: `${BASE}/`, zoneIds: ZONES });
    const { html } = markdownToHtml('[ряд](zone:z-row)', { mdastPlugins: [plugin] });
    expect(html).toContain(`href="${BASE}/board/#z-row"`);
  });

  it('обычные ссылки не трогает', () => {
    const md = '[правило](/rules/meditation/) и [сайт](https://example.com) и [якорь](#x)';
    const plain = markdownToHtml(md).html;
    expect(render(md)).toBe(plain);
  });

  it('по умолчанию берёт зоны из board-zones.ts', () => {
    const plugin = zoneLinksPlugin({ base: BASE });
    const { html } = markdownToHtml('[ряд](zone:z-action-row-minus1)', {
      mdastPlugins: [plugin],
    });
    expect(html).toContain('data-zone="z-action-row-minus1"');
  });

  it('неизвестный id ломает рендер: в ошибке файл и id', () => {
    const file = pathToFileURL(root('src/content/rules/card-cost.md'));
    expect(() => render('[ряд](zone:z-nope)', file)).toThrow(
      /src\/content\/rules\/card-cost\.md.*zone:z-nope/,
    );
  });

  it('пустой id — тоже ошибка', () => {
    expect(() => render('[ряд](zone:)')).toThrow(/zone:/);
  });
});

describe('findZoneLinks', () => {
  it('находит id всех ссылок zone: по порядку, остальные ссылки пропускает', () => {
    const md = [
      'Текст [ряд](zone:z-row) и [правило](/rules/x/).',
      '',
      '- [ячейка](zone:z-row-minus1 "подсказка"), снова [ряд](zone:z-row)',
    ].join('\n');
    expect(findZoneLinks(md)).toEqual(['z-row', 'z-row-minus1', 'z-row']);
  });

  it('пустой id возвращается как пустая строка', () => {
    expect(findZoneLinks('[ряд](zone:)')).toEqual(['']);
  });

  it('без ссылок — пустой массив', () => {
    expect(findZoneLinks('просто текст, zone:z-row без скобок')).toEqual([]);
  });
});

describe('validate-content: инвариант 7г', () => {
  it('битая ссылка zone: в теле Markdown — одна ошибка с файлом и id', () => {
    const { errors } = validateContent({
      contentDir: root('tests/fixtures/bad/zone-link'),
      svgDir: root('src/assets/svg'),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('rules/zone-link.md');
    expect(errors[0]).toContain('zone:z-nope');
  });
});

describe('astro.config.mjs', () => {
  it('процессор Markdown — Sätteri с плагином zone-links и base сайта', async () => {
    const { default: config } = await import('../../astro.config.mjs');
    const processor = config.markdown?.processor as
      { name: string; options: { mdastPlugins: { name?: string }[] } } | undefined;
    expect(processor?.name).toBe('satteri');
    expect(processor?.options.mdastPlugins.map((p) => p.name)).toContain('zone-links');
    expect(config.base).toBe(BASE);
  });
});
