// Страница поля и панель зоны (SPEC 11.5.5, ROADMAP R2.9).
import { expect, test, type Page } from '@playwright/test';

const ZONE = 'z-action-row-minus1';
const highlight = (page: Page, id: string) =>
  page.locator(`.board-schematic [data-highlight="${id}"]`);

/** Острова гидрированы. */
const hydrated = (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('без JS', () => {
  test.use({ javaScriptEnabled: false });

  test('якорь зоны прокручивает к карточке и подсвечивает зону на схеме', async ({ page }) => {
    await page.goto(`board/#${ZONE}`);
    const card = page.locator(`#${ZONE}`);
    await expect(card).toBeInViewport();
    await expect(highlight(page, ZONE)).toBeVisible();
    // Родитель и соседи не подсвечены.
    await expect(highlight(page, 'z-action-row')).toBeHidden();
    await expect(highlight(page, 'z-action-row-plus1')).toBeHidden();
    // Карточку не закрывает закреплённая схема.
    const cardTop = (await card.boundingBox())!.y;
    const boardBottom = await page
      .locator('.board-sticky')
      .evaluate((el) => el.getBoundingClientRect().bottom);
    expect(cardTop).toBeGreaterThanOrEqual(boardBottom - 1);
  });

  test('ссылка zone: в правиле ведёт на /board/#…', async ({ page }) => {
    await page.goto('rules/card-cost/');
    await page.locator(`a.zone-link[data-zone="${ZONE}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/board/#${ZONE}$`));
    await expect(highlight(page, ZONE)).toBeVisible();
  });
});

test('тап по карточке подсвечивает зону и обновляет hash без записи в истории', async ({
  page,
}) => {
  await page.goto('board/');
  await hydrated(page);
  const historyLength = await page.evaluate(() => history.length);
  await expect(page.locator('.board-schematic [data-highlight]:visible')).toHaveCount(0);

  await page.locator('#z-supply > .zone-card__head').click();
  await expect(highlight(page, 'z-supply')).toBeVisible();
  await expect(page).toHaveURL(/#z-supply$/);

  // Вложенная подзона: подсвечивается она, а не родитель.
  await page.locator(`#${ZONE} .zone-card__anchor`).click();
  await expect(highlight(page, ZONE)).toBeVisible();
  await expect(highlight(page, 'z-action-row')).toBeHidden();
  await expect(highlight(page, 'z-supply')).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`#${ZONE}$`));
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test('/board/ на 360 px: без горизонтальной прокрутки, схема не выше 40 % экрана', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('board/');
  await noHorizontalScroll(page);
  const height = (await page.locator('.board-sticky').boundingBox())!.height;
  expect(height).toBeLessThanOrEqual(740 * 0.4 + 1);
});

test('ссылка zone: открывает панель, Esc закрывает, фокус возвращается на ссылку', async ({
  page,
}) => {
  await page.goto('rules/card-cost/');
  await hydrated(page);
  const link = page.locator(`a.zone-link[data-zone="${ZONE}"]`);
  await link.click();

  const sheet = page.getByRole('dialog', { name: 'Дальняя ячейка ряда (−1)' });
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/\/rules\/card-cost\/$/);
  await expect(sheet.locator(`[data-highlight="${ZONE}"]`)).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Подробнее о поле →' })).toHaveAttribute(
    'href',
    `/witcher-board-game-helper/board/#${ZONE}`,
  );
  await noHorizontalScroll(page);

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(link).toBeFocused();

  // «Закрыть» тоже возвращает фокус.
  await link.click();
  await sheet.getByRole('button', { name: 'Закрыть' }).click();
  await expect(sheet).toBeHidden();
  await expect(link).toBeFocused();
});
