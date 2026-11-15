// @vitest-environment happy-dom
// Панель зоны по клику на ссылку zone: (SPEC 11.5.4, ROADMAP R2.9).
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { ZonePeek } from '../../src/islands/ZonePeek';

afterEach(cleanup);

const ZONES = {
  'z-action-row-minus1': { title: 'Дальняя ячейка ряда (−1)', summary: 'Дешевле на 1.' },
};

function page(extra = '') {
  return render(
    <>
      <p>
        <a class="zone-link" data-zone="z-action-row-minus1" href="board/#z-action-row-minus1">
          крайняя правая
        </a>
        <a href="rules/x/">обычная ссылка</a>
        {extra && (
          <a class="zone-link" data-zone={extra} href={`board/#${extra}`}>
            чужая зона
          </a>
        )}
      </p>
      <ZonePeek zones={ZONES} />
    </>,
  );
}

const dialog = () => document.querySelector('dialog')!;
const zoneLink = () => screen.getByRole('link', { name: 'крайняя правая' });

describe('<ZonePeek>', () => {
  it('клик по zone-ссылке: панель со схемой, текстом и ссылкой на /board/, без перехода', () => {
    page();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    act(() => void zoneLink().dispatchEvent(click));
    expect(click.defaultPrevented).toBe(true);
    expect(dialog().open).toBe(true);
    expect(screen.getByRole('heading', { name: 'Дальняя ячейка ряда (−1)' }).id).toBe(
      dialog().getAttribute('aria-labelledby'),
    );
    expect(screen.getByText('Дешевле на 1.')).toBeTruthy();
    expect(dialog().querySelector('[data-highlight="z-action-row-minus1"]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Подсвечено');
    expect(screen.getByRole('link', { name: 'Подробнее о поле →' }).getAttribute('href')).toMatch(
      /\/board\/#z-action-row-minus1$/,
    );
  });

  it('закрытие возвращает фокус на ссылку', () => {
    page();
    fireEvent.click(zoneLink());
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(zoneLink());
    expect(dialog().querySelector('h2')).toBeNull();
  });

  it('клик с модификатором, по обычной ссылке или по неизвестной зоне — браузер переходит сам', () => {
    page('z-unknown');
    const clicks = [
      [zoneLink(), { ctrlKey: true }],
      [zoneLink(), { metaKey: true }],
      [zoneLink(), { button: 1 }],
      [screen.getByRole('link', { name: 'обычная ссылка' }), {}],
      [screen.getByRole('link', { name: 'чужая зона' }), {}],
    ] as const;
    for (const [target, init] of clicks) {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
      act(() => void target.dispatchEvent(click));
      expect(click.defaultPrevented).toBe(false);
      expect(dialog().open).toBe(false);
    }
  });
});
