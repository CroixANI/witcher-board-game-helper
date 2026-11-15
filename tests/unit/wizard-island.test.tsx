// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { WizardIsland } from '../../src/islands/WizardIsland';
import { DEMO_WIZARD } from '../../src/data/demo-wizard';
import { createSafeStorage, type SafeStorage } from '../../src/lib/safe-storage';
import { PARAMS_KEY, storageKey, type WizardState } from '../../src/lib/wizard-engine';
import type { ViewNode, WizardData } from '../../src/lib/wizard-view';

afterEach(cleanup);

/** Хранилище в памяти, но «постоянное» — как рабочий localStorage. */
function memoryStorage(): SafeStorage {
  const map = new Map<string, string>();
  return createSafeStorage(() => ({
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }));
}

/** localStorage недоступен: любое обращение бросает (приватный режим iOS, SecurityError). */
function brokenStorage(): SafeStorage {
  const fail = () => {
    throw new Error('SecurityError');
  };
  return createSafeStorage(() => ({ getItem: fail, setItem: fail, removeItem: fail }));
}

const saved = (storage: SafeStorage, graph: 'setup' | 'turn' = 'turn') =>
  JSON.parse(storage.get(storageKey(graph)) ?? 'null') as WizardState | null;

const demo: WizardData = {
  ...DEMO_WIZARD,
  rules: {
    'setup-action-row': {
      id: 'setup-action-row',
      title: 'Ряд карт действий',
      page: 6,
      summary: 'Как разложить ряд.',
      important: false,
      html: '<p>Полный текст правила</p>',
    },
    'hand-limit': {
      id: 'hand-limit',
      title: 'Максимум карт в руке',
      page: 9,
      summary: 'Не больше 7.',
      important: true,
      html: '<p>Семь</p>',
    },
  },
  components: {
    'action-card': {
      id: 'action-card',
      name: 'Карта действия',
      iconSvg: '<svg aria-hidden="true"></svg>',
      howToTell: 'Рубашка с медальоном',
    },
  },
};

// Тестовый граф из 4 узлов (подготовка): step → info → choice → end, с прогрессом.
const setupNodes: ViewNode[] = [
  {
    id: 'a',
    type: 'step',
    title: 'Поле',
    phase: 'setup',
    pages: 6,
    checklist: [{ text: 'Разложите поле' }],
    next: 'b',
  },
  { id: 'b', type: 'info', title: 'Пояснение', phase: 'setup', pages: 7, body: 'Текст', next: 'c' },
  {
    id: 'c',
    type: 'choice',
    title: 'Первый игрок',
    phase: 'setup',
    pages: 8,
    options: [
      { label: 'Выбрали', next: 'd' },
      { label: 'Ещё нет', next: 'b' },
    ],
  },
  { id: 'd', type: 'end', title: 'Готово', phase: 'setup', pages: 8, outcome: 'setup-complete' },
];
const setup: WizardData = {
  graph: 'setup',
  title: 'Подготовка',
  entry: 'a',
  nodes: setupNodes,
  progress: setupNodes.map((n) => n.id),
  rules: {},
  components: {},
};

const heading = () => screen.getByRole('heading', { level: 2 });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const backButton = () => screen.getByRole('button', { name: '← Назад' });

describe('<WizardIsland> на графе из 4 узлов (подготовка)', () => {
  it('проходит step → info → choice → end, показывает прогресс N/M и «стр. N»', () => {
    render(<WizardIsland data={setup} storage={memoryStorage()} />);
    expect(heading().textContent).toBe('Поле');
    expect(screen.getByText('Подготовка 1/4')).toBeTruthy();
    expect(screen.getByText('стр. 6')).toBeTruthy();
    expect(backButton().hasAttribute('disabled')).toBe(true);

    click('Далее →');
    expect(heading().textContent).toBe('Пояснение');
    expect(screen.getByText('Текст')).toBeTruthy();
    click('Далее →');
    expect(screen.getByText('Подготовка 3/4')).toBeTruthy();
    click(/Выбрали/);
    expect(heading().textContent).toBe('Готово');
    expect((screen.getByRole('progressbar') as HTMLProgressElement).value).toBe(4);

    click('Начать подготовку заново');
    expect(heading().textContent).toBe('Поле');
    expect(backButton().hasAttribute('disabled')).toBe(true);
  });

  it('«⟲ Заново» спрашивает подтверждение; «Отмена» ничего не сбрасывает', () => {
    render(<WizardIsland data={setup} storage={memoryStorage()} />);
    click('Далее →');
    click('⟲ Начать Заново');
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(heading().textContent).toBe('Пояснение');

    click('⟲ Начать Заново');
    click('Да, заново');
    expect(heading().textContent).toBe('Поле');
  });
});

describe('<WizardIsland> на демо-графе (все типы узлов)', () => {
  it('choice ставит players: пункт чек-листа с showIf виден только при 4–5 игроках', () => {
    render(<WizardIsland data={demo} storage={memoryStorage()} />);
    expect(heading().textContent).toBe('Сколько игроков?');
    expect(screen.getByText('Добавляется доп. стопка монстров')).toBeTruthy();
    click(/^2 игрока/);
    expect(heading().textContent).toBe('Ряд карт действий');
    expect(screen.queryByText('Только при 4–5 игроках: доп. пункт')).toBeNull();

    fireEvent.click(backButton());
    click(/^5 игроков/);
    expect(screen.getByText('Только при 4–5 игроках: доп. пункт')).toBeTruthy();
  });

  it('step: схема поля, компоненты, предупреждение, свёрнутые карточки правил (и из чек-листа)', () => {
    const { container } = render(<WizardIsland data={demo} storage={memoryStorage()} />);
    click(/^2 игрока/);
    expect(container.querySelector('[data-highlight="z-action-row"]')).toBeTruthy();
    expect(container.querySelector('[data-highlight="z-action-deck"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Карта действия' }).getAttribute('href')).toMatch(
      /reference\/#action-card$/,
    );
    expect(screen.getByText(/Карты стоимостью 0/)).toBeTruthy();

    const cards = container.querySelectorAll('details.rule-card');
    expect([...cards].map((d) => d.querySelector('.rule-card__title')?.textContent)).toEqual([
      'Ряд карт действий',
      'Максимум карт в руке',
    ]);
    expect([...cards].every((d) => !d.hasAttribute('open'))).toBe(true);
    expect(cards[0]?.querySelector('.rule-card__pages')?.textContent).toBe('стр. 6');
    expect(cards[0]?.innerHTML).toContain('<p>Полный текст правила</p>');
    expect(cards[1]?.classList.contains('rule-card--important')).toBe(true);
  });

  it('галочки чек-листа сохраняются и не блокируют «Далее»', () => {
    const storage = memoryStorage();
    render(<WizardIsland data={demo} storage={storage} />);
    click(/^2 игрока/);
    const box = screen.getByRole('checkbox', { name: 'Разложите ряд из 6 карт' });
    fireEvent.click(box);
    expect((box as HTMLInputElement).checked).toBe(true);
    expect(saved(storage)?.checked).toEqual({ 'd-table': [1] });
    click('Далее →');
    expect(heading().textContent).toBe('Будет битва?');
  });

  it('question «Да» ставит флаг, «Назад» восстанавливает флаги на момент входа в узел', () => {
    const storage = memoryStorage();
    render(<WizardIsland data={demo} storage={storage} />);
    click(/^2 игрока/);
    click('Далее →');
    expect(screen.getByText('Вы выбрали битву в фазе II?')).toBeTruthy();
    click(/^Да/);
    expect(saved(storage)?.flags).toEqual({ fought: true });

    fireEvent.click(backButton());
    expect(heading().textContent).toBe('Будет битва?');
    expect(saved(storage)?.flags).toEqual({});
  });

  it('loop: счётчик «Ход N» и «Ходит: …», цикл и выход', () => {
    render(<WizardIsland data={demo} storage={memoryStorage()} />);
    click(/^2 игрока/);
    click('Далее →');
    click(/^Да/);
    expect(screen.getByText('Ход 1')).toBeTruthy();
    expect(screen.getByText('Ходит: вы')).toBeTruthy();
    click(/Следующий ход/);
    expect(screen.getByText('Ход 2')).toBeTruthy();
    fireEvent.click(backButton());
    expect(screen.getByText('Ход 1')).toBeTruthy();
    click(/Битва окончена/);
    expect(heading().textContent).toBe('Итоги');
    expect(screen.getByText('Второй абзац.')).toBeTruthy();
  });

  it('end «Ход завершён» → «Мой следующий ход»: в resetTo, параметры сохранены, флаги сброшены', () => {
    const storage = memoryStorage();
    render(<WizardIsland data={demo} storage={storage} />);
    click(/^3 игрока/);
    click('Далее →');
    click(/^Да/);
    click(/Битва окончена/);
    click('Далее →');
    expect(screen.getByText(/Передайте ход/)).toBeTruthy();
    click('Мой следующий ход');
    expect(heading().textContent).toBe('Будет битва?');
    expect(saved(storage)).toMatchObject({ params: { players: 3 }, flags: {}, history: [] });
    expect(JSON.parse(storage.get(PARAMS_KEY) ?? '{}')).toEqual({ players: 3 });
  });
});

describe('<WizardIsland>: сохранение, хранилище, доступность', () => {
  it('перезагрузка (новый монтаж с тем же хранилищем) сохраняет шаг, «Назад» и отметки', () => {
    const storage = memoryStorage();
    const first = render(<WizardIsland data={demo} storage={storage} />);
    click(/^4 игрока/);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Разложите ряд из 6 карт' }));
    click('Далее →');
    first.unmount();

    render(<WizardIsland data={demo} storage={storage} />);
    expect(heading().textContent).toBe('Будет битва?');
    fireEvent.click(backButton());
    expect(heading().textContent).toBe('Ряд карт действий');
    expect(
      (screen.getByRole('checkbox', { name: 'Разложите ряд из 6 карт' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(screen.getByText('Только при 4–5 игроках: доп. пункт')).toBeTruthy();
  });

  it('без localStorage: баннер «прогресс не сохранится», wizard работает в памяти', () => {
    render(<WizardIsland data={demo} storage={brokenStorage()} />);
    expect(screen.getByRole('status').textContent).toMatch(/Прогресс не сохранится/);
    click(/^2 игрока/);
    click('Далее →');
    click(/^Да/);
    expect(heading().textContent).toBe('Битва');
    fireEvent.click(backButton());
    expect(heading().textContent).toBe('Будет битва?');
  });

  it('с рабочим хранилищем баннера нет', () => {
    render(<WizardIsland data={demo} storage={memoryStorage()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('по умолчанию берёт localStorage окружения', () => {
    localStorage.clear();
    const first = render(<WizardIsland data={demo} />);
    click(/^2 игрока/);
    first.unmount();
    expect(JSON.parse(localStorage.getItem(storageKey('turn')) ?? '{}').current).toBe('d-table');
    render(<WizardIsland data={demo} />);
    expect(heading().textContent).toBe('Ряд карт действий');
    localStorage.clear();
  });

  it('фокус на заголовке нового узла и объявление через aria-live (SPEC 6.7)', () => {
    const { container } = render(<WizardIsland data={demo} storage={memoryStorage()} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('');
    expect(document.activeElement).not.toBe(heading());

    click(/^2 игрока/);
    expect(heading().getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(heading());
    expect(live?.textContent).toBe('Шаг: Ряд карт действий');
  });

  it('восстановление после перезагрузки не уводит фокус', () => {
    const storage = memoryStorage();
    const first = render(<WizardIsland data={demo} storage={storage} />);
    click(/^2 игрока/);
    first.unmount();
    render(<WizardIsland data={demo} storage={storage} />);
    expect(heading().textContent).toBe('Ряд карт действий');
    expect(document.activeElement).not.toBe(heading());
  });

  it('варианты — кнопки, чек-лист — нативные чекбоксы', () => {
    render(<WizardIsland data={demo} storage={memoryStorage()} />);
    expect(screen.getAllByRole('button', { name: /игрок/ })).toHaveLength(4);
    click(/^2 игрока/);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });
});
