// @vitest-environment happy-dom
// R2.4: итог подготовки, порядок выбора планшетов, случайный первый игрок, переход к ходу.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { RandomFirstPlayer } from '../../src/islands/RandomFirstPlayer';
import { SetupSummary } from '../../src/islands/SetupSummary';
import { WizardIsland } from '../../src/islands/WizardIsland';
import { START_RESOURCES } from '../../src/data/start-resources';
import { createSafeStorage, type SafeStorage } from '../../src/lib/safe-storage';
import { buildGraph, loadState, PARAMS_KEY } from '../../src/lib/wizard-engine';
import type { ViewNode, WizardData } from '../../src/lib/wizard-view';

afterEach(cleanup);

function memoryStorage(): SafeStorage {
  const map = new Map<string, string>();
  return createSafeStorage(() => ({
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }));
}

/** Ячейки таблицы раздачи без строки заголовков: [место, карты, золото]. */
function resourceRows(): string[][] {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((c) => c.textContent ?? ''));
}

const pickOrder = () =>
  within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('<SetupSummary>', () => {
  it.each([2, 3, 4, 5] as const)('%i игрока: таблица = SPEC 7.1 только для этого числа', (n) => {
    render(<SetupSummary players={n} />);
    const rows = resourceRows();
    expect(rows).toHaveLength(n);
    expect(rows.map(([, cards, gold]) => [Number(cards), Number(gold)])).toEqual(
      START_RESOURCES[n].map(({ cards, gold }) => [cards, gold]),
    );
    expect(rows[0]![0]).toContain('первый игрок');
  });

  it('порядок планшетов при 4 игроках: 4 → 3 → 2 → 1, первый — последним', () => {
    render(<SetupSummary players={4} />);
    expect(pickOrder()).toEqual(['4-й — справа от первого', '3-й', '2-й', '1-й — первый игрок']);
    expect(screen.queryByText(/последний оставшийся/)).toBeNull();
  });

  it('при 2 игроках выбирает второй, потом первый', () => {
    render(<SetupSummary players={2} />);
    expect(pickOrder()).toEqual(['2-й — справа от первого', '1-й — первый игрок']);
  });

  it('при 5 игроках первому достаётся последний планшет', () => {
    render(<SetupSummary players={5} />);
    expect(pickOrder()).toHaveLength(5);
    expect(screen.getByText(/последний оставшийся планшет/)).toBeTruthy();
  });

  it('без числа игроков — подсказка вместо таблицы', () => {
    render(<SetupSummary players={undefined} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/Число игроков не выбрано/)).toBeTruthy();
  });
});

describe('<RandomFirstPlayer>', () => {
  it('🎲: место считается от владельца телефона, 1-й — «вы»', () => {
    const rolls = [2, 0];
    const asked: number[] = [];
    const random = (n: number) => {
      asked.push(n);
      return rolls.shift()!;
    };
    render(<RandomFirstPlayer players={3} random={random} />);
    fireEvent.click(screen.getByRole('button', { name: /Выбрать случайно/ }));
    expect(screen.getByText(/первым ходит 3-й игрок/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Бросить ещё раз/ }));
    expect(screen.getByText('Первым ходите вы.')).toBeTruthy();
    expect(asked).toEqual([3, 3]);
  });

  it('результат объявляется через aria-live', () => {
    render(<RandomFirstPlayer players={5} random={() => 4} />);
    fireEvent.click(screen.getByRole('button', { name: /Выбрать случайно/ }));
    const live = screen.getByText(/5-й игрок/);
    expect(live.getAttribute('aria-live')).toBe('polite');
  });

  it('по умолчанию — crypto: результат в диапазоне мест', () => {
    render(<RandomFirstPlayer players={2} />);
    fireEvent.click(screen.getByRole('button', { name: /Выбрать случайно/ }));
    expect(screen.getByText(/Первым ходите вы\.|первым ходит 2-й игрок/)).toBeTruthy();
  });

  it('без числа игроков ничего не показывает', () => {
    const { container } = render(<RandomFirstPlayer players={undefined} />);
    expect(container.innerHTML).toBe('');
  });
});

// Мини-граф подготовки: число игроков → s09 с 🎲 → итог.
const nodes: ViewNode[] = [
  {
    id: 'p',
    type: 'choice',
    title: 'Число игроков',
    phase: 'setup',
    pages: 6,
    options: [
      { label: '2', next: 'f', setParam: { key: 'players', value: 2 } },
      { label: '4', next: 'f', setParam: { key: 'players', value: 4 } },
    ],
  },
  {
    id: 'f',
    type: 'step',
    title: 'Первый игрок',
    phase: 'setup',
    pages: 7,
    checklist: [{ text: 'Выберите первого игрока' }],
    widget: 'random-first-player',
    next: 'end',
  },
  { id: 'end', type: 'end', title: 'Готово', phase: 'setup', pages: 8, outcome: 'setup-complete' },
];
const data: WizardData = {
  graph: 'setup',
  title: 'Подготовка',
  entry: 'p',
  nodes,
  rules: {},
  components: {},
};

describe('<WizardIsland>: итог подготовки', () => {
  it('🎲 на шаге с widget, итог для выбранного числа, «Перейти к ходу →» передаёт players', () => {
    const storage = memoryStorage();
    render(<WizardIsland data={data} storage={storage} />);
    fireEvent.click(screen.getByRole('button', { name: /^4/ }));
    expect(screen.getByRole('button', { name: /Выбрать случайно/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Далее →' }));

    expect(resourceRows()).toHaveLength(4);
    const link = screen.getByRole('link', { name: 'Перейти к ходу →' });
    expect(link.getAttribute('href')).toMatch(/\/turn\/$/);
    expect(JSON.parse(storage.get(PARAMS_KEY) ?? '{}')).toEqual({ players: 4 });

    // /turn/ читает тот же ключ: число игроков уже известно и не спрашивается.
    const turn = buildGraph([{ id: 't', type: 'end', outcome: 'turn-complete' } as ViewNode], 't');
    expect(loadState(turn, 'turn', storage).params.players).toBe(4);
  });

  it('у шагов без widget кнопки 🎲 нет; «Начать подготовку заново» остаётся', () => {
    render(<WizardIsland data={data} storage={memoryStorage()} />);
    expect(screen.queryByRole('button', { name: /Выбрать случайно/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Далее →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Начать подготовку заново' }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Число игроков');
  });
});
