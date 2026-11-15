// Wizard подготовки целиком (SPEC 13.3, 7): 2 и 5 игроков, итоговая таблица, перезагрузка.
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { boardPickOrder, START_RESOURCES, type PlayerCount } from '../../src/data/start-resources';

const STEP_8 = '⑧ Монстры';
const STEP_EXTRA = 'Дополнительно для 4–5 игроков';
const STEP_SUMMARY = 'Подготовка завершена';

const heading = (page: Page) => page.locator('.wizard-node h2');
const checklist = (page: Page) => page.locator('.wizard-checklist');

/** Остров гидрирован, сохранённый state прочитан — кнопки уже реагируют на клики. */
async function openSetup(page: Page) {
  await page.goto('setup/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

async function choosePlayers(page: Page, players: PlayerCount) {
  await page.getByRole('button', { name: new RegExp(`^${players} игрок`) }).click();
}

const next = (page: Page) => page.getByRole('button', { name: 'Далее →' }).click();

/**
 * Проходит wizard от выбора числа игроков до итога. На каждом шаге — скриншот в отчёт
 * и проверка шага, если она задана. Возвращает заголовки пройденных шагов.
 */
async function walkSetup(
  page: Page,
  testInfo: TestInfo,
  players: PlayerCount,
  checks: Record<string, () => Promise<void>> = {},
): Promise<string[]> {
  await openSetup(page);
  await choosePlayers(page, players);
  const titles: string[] = [];
  for (let i = 0; i < 20; i++) {
    const title = (await heading(page).textContent())!.trim();
    // Переход завершён, когда заголовок сменился: иначе скриншот снял бы прошлый шаг.
    expect(titles).not.toContain(title);
    titles.push(title);
    await testInfo.attach(`${players}p-${String(titles.length).padStart(2, '0')} ${title}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await checks[title]?.();
    if (title === STEP_SUMMARY) return titles;
    await next(page);
    await expect(heading(page)).not.toHaveText(title);
  }
  throw new Error(`Не дошли до итога: ${titles.join(' → ')}`);
}

async function expectSummary(page: Page, players: PlayerCount) {
  const rows = page.locator('.setup-summary__table tbody tr');
  await expect(rows).toHaveCount(players);
  for (const [i, { cards, gold }] of START_RESOURCES[players].entries()) {
    await expect(rows.nth(i).locator('td')).toHaveText([String(cards), String(gold)]);
  }
  const order = page.locator('.setup-summary__order li');
  await expect(order).toHaveCount(players);
  for (const [i, seat] of boardPickOrder(players).entries()) {
    await expect(order.nth(i)).toHaveText(new RegExp(`^${seat}-й`));
  }
  await expect(page.getByRole('link', { name: 'Перейти к ходу →' })).toHaveAttribute(
    'href',
    '/witcher-board-game-helper/turn/',
  );
}

test('2 игрока: 2×I + 1×II, без доп. шага, раздача для двоих', async ({ page }, testInfo) => {
  const titles = await walkSetup(page, testInfo, 2, {
    [STEP_8]: async () => {
      await expect(checklist(page)).toContainText('2 жетона I уровня и 1 жетон II уровня');
      await expect(checklist(page)).not.toContainText('3 жетона I уровня');
    },
    [STEP_SUMMARY]: () => expectSummary(page, 2),
  });
  expect(titles).not.toContain(STEP_EXTRA);
});

test('5 игроков: 3×I, доп. шаг с 2 жетонами, раздача для пятерых', async ({ page }, testInfo) => {
  const titles = await walkSetup(page, testInfo, 5, {
    [STEP_8]: async () => {
      await expect(checklist(page)).toContainText('3 жетона I уровня');
      await expect(checklist(page)).not.toContainText('1 жетон II уровня');
    },
    [STEP_EXTRA]: async () => {
      await expect(checklist(page)).toContainText('2 случайных жетона монстров I уровня');
      await expect(checklist(page)).not.toContainText('1 случайный жетон');
    },
    [STEP_SUMMARY]: () => expectSummary(page, 5),
  });
  expect(titles).toContain(STEP_EXTRA);
  // Доп. шаг идёт после компонентов игрока и прямо перед итогом.
  expect(titles.slice(-2)).toEqual([STEP_EXTRA, STEP_SUMMARY]);
});

test('перезагрузка на шаге ⑤ возвращает тот же шаг и отметки', async ({ page }) => {
  await openSetup(page);
  await choosePlayers(page, 3);
  const step5 = '⑤ Карты исследования и событий';
  for (let i = 0; i < 4; i++) await next(page);
  await expect(heading(page)).toHaveText(step5);
  const progress = await page.locator('.wizard-bar__title').textContent();
  const first = checklist(page).getByRole('checkbox').first();
  await first.check();

  await page.reload();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(heading(page)).toHaveText(step5);
  await expect(page.locator('.wizard-bar__title')).toHaveText(progress!);
  await expect(checklist(page).getByRole('checkbox').first()).toBeChecked();
  await expect(page.getByRole('button', { name: '← Назад' })).toBeEnabled();
});
