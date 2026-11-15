// @vitest-environment happy-dom
// Нижняя панель на <dialog> (SPEC 11.5.4, ROADMAP R2.9).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { BottomSheet } from '../../src/islands/BottomSheet';

afterEach(cleanup);

const dialog = () => document.querySelector('dialog')!;

function sheet(open: boolean, onClose = vi.fn()) {
  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="t" class="extra">
      <h2 id="t">Заголовок</h2>
    </BottomSheet>
  );
}

describe('<BottomSheet>', () => {
  it('закрыта: dialog без open, связь с заголовком и класс', () => {
    render(sheet(false));
    expect(dialog().open).toBe(false);
    expect(dialog().getAttribute('aria-labelledby')).toBe('t');
    expect(dialog().className).toBe('bottom-sheet extra');
  });

  it('open → showModal(), open=false → close() и onClose', () => {
    const onClose = vi.fn();
    const { rerender } = render(sheet(false, onClose));
    const showModal = vi.spyOn(dialog(), 'showModal');
    rerender(sheet(true, onClose));
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog().open).toBe(true);
    rerender(sheet(false, onClose));
    expect(dialog().open).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('«Закрыть» закрывает и вызывает onClose', () => {
    const onClose = vi.fn();
    render(sheet(true, onClose));
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(dialog().open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('тап по фону (сам dialog) закрывает, по содержимому — нет', () => {
    const onClose = vi.fn();
    render(sheet(true, onClose));
    fireEvent.click(screen.getByRole('heading', { name: 'Заголовок' }));
    expect(dialog().open).toBe(true);
    fireEvent.click(dialog());
    expect(dialog().open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
