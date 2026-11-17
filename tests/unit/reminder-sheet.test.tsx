// @vitest-environment happy-dom
// Панель «Не забудь» (SPEC 8.9, ROADMAP R3.4).
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { ReminderSheet } from '../../src/islands/ReminderSheet';
import type { ReminderView } from '../../src/lib/wizard-view';

afterEach(cleanup);

const REMINDERS: ReminderView[] = [
  {
    id: 'hand-limit',
    text: 'В руке максимум 7 карт.',
    page: 9,
    phases: ['general'],
    rule: { id: 'hand-limit', title: 'Максимум карт в руке' },
  },
  {
    id: 'last-trophy',
    text: 'Последний трофей не медитацией.',
    page: [15, 29],
    phases: ['phase2'],
    rule: { id: 'last-trophy-meditation', title: 'Последний трофей' },
  },
];

const dialog = () => document.querySelector('dialog')!;
const openButton = () => screen.getByRole('button', { name: /Не забудь/ });

describe('<ReminderSheet>', () => {
  it('закрыта: только кнопка, панель связана с заголовком', () => {
    render(<ReminderSheet reminders={REMINDERS} phase="phase1" />);
    expect(openButton().getAttribute('aria-haspopup')).toBe('dialog');
    expect(dialog().open).toBe(false);
    expect(dialog().getAttribute('aria-labelledby')).toBe('reminder-sheet-title');
  });

  it('кнопка открывает панель: все пункты по порядку, ссылки на правила и страницы', () => {
    render(<ReminderSheet reminders={REMINDERS} phase="phase1" />);
    fireEvent.click(openButton());
    expect(dialog().open).toBe(true);
    const items = within(dialog()).getAllByRole('listitem');
    expect(items.map((li) => li.querySelector('p')!.textContent)).toEqual([
      'В руке максимум 7 карт.',
      'Последний трофей не медитацией.',
    ]);
    const link = within(items[1]!).getByRole('link', { name: 'Последний трофей' });
    expect(link.getAttribute('href')).toMatch(/rules\/last-trophy-meditation\/$/);
    expect(items[1]!.textContent).toContain('стр. 15, 29');
  });

  it('пункты текущей фазы помечены «сейчас», general не помечается', () => {
    const { rerender } = render(<ReminderSheet reminders={REMINDERS} phase="phase2" />);
    const marked = () => document.querySelectorAll('.reminder--now');
    expect(marked()).toHaveLength(1);
    expect(document.querySelector('.reminder--now')!.textContent).toContain('сейчас');
    rerender(<ReminderSheet reminders={REMINDERS} phase="general" />);
    expect(marked()).toHaveLength(0);
  });

  it('закрытие (Esc / «Закрыть») возвращает фокус на кнопку', () => {
    render(<ReminderSheet reminders={REMINDERS} phase="phase1" />);
    fireEvent.click(openButton());
    act(() => {
      fireEvent.click(within(dialog()).getByRole('button', { name: 'Закрыть' }));
    });
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(openButton());
  });
});
