// Ссылки `zone:` в Markdown (SPEC 11.5.2, ROADMAP R2.8).
import { fileURLToPath, pathToFileURL } from 'node:url';
import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vitest';
import { validateContent } from '../../scripts/validate-content';
import { findZoneLinks, zoneLinksPlugin } from '../../src/lib/zone-links';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const BASE = '/witcher-board-game-helper';
const ZONES = new Set(['z-row', 'z-row-minus1']);

async function render(md: string, fileURL?: URL) {
  const plugin = zoneLinksPlugin({ base: BASE, zoneIds: ZONES });
  const { html } = await markdownToHtml(md, { mdastPlugins: [plugin], fileURL });
  return html;
}

describe('zoneLinksPlugin', () => {
  it('zone:<id> → ссылка на /board/#<id> с base path, class и data-zone', async () => {
    expect(await render('Смотрите [ряд карт](zone:z-row).')).toBe(
      `<p>Смотрите <a href="${BASE}/board/#z-row" class="zone-link" data-zone="z-row">ряд карт</a>.</p>\n`,
    );
  });

  it('подзона работает так же', async () => {
    const html = await render('[ячейка −1](zone:z-row-minus1)');
    expect(html).toContain(`href="${BASE}/board/#z-row-minus1"`);
    expect(html).toContain('data-zone="z-row-minus1"');
  });

  it('base со слешем на конце не даёт двойного слеша', async () => {
    const plugin = zoneLinksPlugin({ base: `${BASE}/`, zoneIds: ZONES });
    const { html } = await markdownToHtml('[ряд](zone:z-row)', { mdastPlugins: [plugin] });
    expect(html).toContain(`href="${BASE}/board/#z-row"`);
  });

  it('обычные ссылки не трогает', async () => {
    const md = '[правило](/rules/meditation/) и [сайт](https://example.com) и [якорь](#x)';
    const plain = (await markdownToHtml(md)).html;
    expect(await render(md)).toBe(plain);
  });

  it('по умолчанию берёт зоны из board-zones.ts', async () => {
    const plugin = zoneLinksPlugin({ base: BASE });
    const { html } = await markdownToHtml('[ряд](zone:z-action-row-minus1)', {
      mdastPlugins: [plugin],
    });
    expect(html).toContain('data-zone="z-action-row-minus1"');
  });

  it('неизвестный id ломает рендер: в ошибке файл и id', async () => {
    const file = pathToFileURL(root('src/content/rules/card-cost.md'));
    await expect(render('[ряд](zone:z-nope)', file)).rejects.toThrow(
      /src\/content\/rules\/card-cost\.md.*zone:z-nope/,
    );
  });

  it('пустой id — тоже ошибка', async () => {
    await expect(render('[ряд](zone:)')).rejects.toThrow(/zone:/);
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
