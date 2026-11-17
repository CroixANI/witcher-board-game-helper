// «Сейчас не мой ход» и панель «Не забудь» (SPEC 8.8, 8.9; ROADMAP R3.4).
import { expect, test, type Page } from '@playwright/test';

const PARAMS_KEY = 'twow:v1:params';
const situations = (page: Page) => page.locator('details.situation');
const bet = (page: Page) => page.locator('details#place-bet');
const hydrated = (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Число игроков в общем ключе параметров — как после подготовки. */
async function withPlayers(page: Page, players: number) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key!, value!),
    [PARAMS_KEY, JSON.stringify({ players, school: 'bear' })],
  );
}

test.describe('без JS', () => {
  test.use({ javaScriptEnabled: false });

  test('видны все 9 ситуаций, включая ставку', async ({ page }) => {
    await page.goto('turn/not-my-turn/');
    await expect(situations(page)).toHaveCount(9);
    await expect(bet(page)).toBeVisible();
    await bet(page).locator('summary').click();
    await expect(bet(page)).toContainText('стр. 21, 28');
  });
});

test('2 игрока: «Сделать ставку» скрыта, подпись о числе игроков', async ({ page }) => {
  await withPlayers(page, 2);
  await page.goto('turn/not-my-turn/');
  await expect(bet(page)).toBeHidden();
  await expect(situations(page).filter({ visible: true })).toHaveCount(8);
  await expect(page.locator('#players-note')).toContainText('на 2 игроков');
});

test('4 игрока: ставка видна', async ({ page }) => {
  await withPlayers(page, 4);
  await page.goto('turn/not-my-turn/');
  await expect(bet(page)).toBeVisible();
  await expect(situations(page).filter({ visible: true })).toHaveCount(9);
});

test('ссылка zone: в ситуации открывает панель зоны; 360 px без прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('turn/not-my-turn/');
  await hydrated(page);
  await noHorizontalScroll(page);
  const item = page.locator('details#read-event');
  await item.locator('summary').click();
  await item.locator('a.zone-link[data-zone="z-event-deck"]').click();
  const sheet = page.getByRole('dialog', { name: 'Колода событий' });
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/\/turn\/not-my-turn\/$/);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('wizard хода: «Не забудь» открывается с клавиатуры, Esc закрывает; ссылка «Не мой ход»', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await withPlayers(page, 2);
  await page.goto('turn/');
  await hydrated(page);
  await expect(page.locator('.wizard-node h2')).toHaveText('Ваш ход');
  await noHorizontalScroll(page);
  // Заголовок фазы в баре не обрезан, хотя кнопок стало четыре.
  const title = page.locator('.wizard-bar__title');
  expect(await title.evaluate((e) => e.scrollWidth <= e.clientWidth && e.clientWidth > 0)).toBe(
    true,
  );

  const button = page.getByRole('button', { name: /Не забудь/ });
  await button.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Не забудь' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('listitem')).toHaveCount(12);
  await expect(sheet).toContainText('В руке максимум 7 карт');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(button).toBeFocused();

  await page.getByRole('link', { name: 'Сейчас не мой ход →' }).click();
  await expect(page).toHaveURL(/\/turn\/not-my-turn\/$/);
  await expect(bet(page)).toBeHidden();
});
