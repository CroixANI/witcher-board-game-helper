import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { BoardSchematic } from '../../src/islands/BoardSchematic';
import { BOARD_ZONES } from '../../src/data/board-zones';

const render = (props: Parameters<typeof BoardSchematic>[0]) =>
  renderToString(h(BoardSchematic, props));

const highlighted = (html: string) =>
  [...html.matchAll(/data-highlight="([^"]+)"/g)].map((m) => m[1]);

describe('<BoardSchematic>', () => {
  it('без зон — только подложка, без подписи-легенды', () => {
    const html = render({ zones: [] });
    expect(html).toMatch(/^<figure class="board-schematic"><svg viewBox="0 0 200 140" role="img"/);
    expect(html).toContain('aria-label="Схема игрового поля"');
    expect(highlighted(html)).toEqual([]);
    expect(html).not.toContain('<figcaption');
  });

  it('подсвечивает зоны в заданном порядке рамками по координатам', () => {
    const html = render({ zones: ['z-elixir-deck', 'z-action-row'] });
    expect(highlighted(html)).toEqual(['z-elixir-deck', 'z-action-row']);
    expect(html).toContain('<rect x="134.5" y="13.5" width="21" height="84" rx="1.5"></rect>');
  });

  it('любая из 14 зон подсвечивается', () => {
    for (const { id } of BOARD_ZONES) expect(highlighted(render({ zones: [id] }))).toEqual([id]);
  });

  it('подписи — бейджи на схеме и в легенде; note зоны попадает в легенду', () => {
    const html = render({ zones: ['z-action-row', 'z-supply'], labels: { 'z-action-row': '2' } });
    expect(html.match(/class="board-schematic__badge"/g)).toHaveLength(1);
    expect(html).toContain('<span class="board-schematic__legend-badge">2</span>');
    expect(html).toContain('«правая» (−1)');
    expect(html).toContain('Золото и кубики');
  });

  it('aria-label перечисляет подсвеченные зоны', () => {
    expect(render({ zones: ['z-supply'] })).toContain(
      'aria-label="Схема игрового поля. Подсвечено: Золото и кубики"',
    );
  });

  it('подложка декоративна и без id: две схемы на странице не дают дублей', () => {
    const html = render({ zones: ['z-map'] });
    expect(html).not.toMatch(/\sid="/);
    expect(html).toContain('data-zone="z-map"');
    expect(html).toMatch(/<svg aria-hidden="true" focusable="false"/);
  });

  it('неизвестная зона в zones или labels — понятная ошибка', () => {
    expect(() => render({ zones: ['z-nope'] })).toThrow(/нет зоны «z-nope»/);
    expect(() => render({ zones: [], labels: { 'z-nope': '1' } })).toThrow(/нет зоны «z-nope»/);
  });
});

describe('<BoardSchematic> бейджи', () => {
  it('бейдж на верхней границе зоны, у края поля — не выходит за viewBox', () => {
    const row = render({ zones: ['z-action-row'], labels: { 'z-action-row': '2' } });
    expect(row).toMatch(/<g class="board-schematic__badge"><rect x="135" y="10"/);
    const map = render({ zones: ['z-map'], labels: { 'z-map': '8.5' } });
    expect(map).toMatch(/<g class="board-schematic__badge"><rect x="1" y="0"/);
  });
});
