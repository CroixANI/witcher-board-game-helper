// @vitest-environment happy-dom
// Остров страницы поля (SPEC 11.5.3, ROADMAP R2.9): тап по карточке, hash, hashchange.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/preact';
import { BoardPage } from '../../src/islands/BoardPage';

const IDS = ['z-row', 'z-row-minus1', 'z-supply'];

beforeEach(() => history.replaceState(null, '', '/board/'));
afterEach(cleanup);

function page() {
  render(
    <BoardPage zoneIds={IDS}>
      <section id="z-row" class="zone-card">
        <div class="zone-card__head">
          <h2>
            <a class="zone-card__anchor" href="#z-row">
              Ряд
            </a>
          </h2>
          <p>Описание ряда</p>
        </div>
        <a href="reference/#action-card">Карты действий</a>
        <section id="z-row-minus1" class="zone-card">
          <a class="zone-card__anchor" href="#z-row-minus1">
            Ячейка −1
          </a>
        </section>
      </section>
      <p>Вне карточек</p>
    </BoardPage>,
  );
}

const root = () => document.querySelector('.board-page')!;
const click = (el: Element) => {
  const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  act(() => void el.dispatchEvent(e));
  return e;
};
const setHash = (hash: string) =>
  act(() => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

describe('<BoardPage>', () => {
  it('без hash — без data-current (работают правила :target)', () => {
    page();
    expect(root().hasAttribute('data-current')).toBe(false);
  });

  it('hash зоны при загрузке → data-current', () => {
    history.replaceState(null, '', '/board/#z-supply');
    page();
    expect(root().getAttribute('data-current')).toBe('z-supply');
  });

  it('hashchange синхронизирует подсветку; неизвестный hash её снимает', () => {
    page();
    setHash('#z-row-minus1');
    expect(root().getAttribute('data-current')).toBe('z-row-minus1');
    setHash('#main');
    expect(root().hasAttribute('data-current')).toBe(false);
  });

  it('тап по карточке: ближайшая (вложенная) зона, hash через replaceState', () => {
    page();
    const length = history.length;
    click(screen.getByText('Описание ряда'));
    expect(root().getAttribute('data-current')).toBe('z-row');
    expect(location.hash).toBe('#z-row');

    const anchor = click(screen.getByRole('link', { name: 'Ячейка −1' }));
    expect(anchor.defaultPrevented).toBe(true);
    expect(root().getAttribute('data-current')).toBe('z-row-minus1');
    expect(location.hash).toBe('#z-row-minus1');
    expect(history.length).toBe(length);
  });

  it('обычные ссылки в карточке и клики вне карточек не перехватываются', () => {
    page();
    const link = click(screen.getByRole('link', { name: 'Карты действий' }));
    expect(link.defaultPrevented).toBe(false);
    click(screen.getByText('Вне карточек'));
    expect(root().hasAttribute('data-current')).toBe(false);
  });
});
