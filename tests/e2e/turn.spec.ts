// Wizard хода, фаза I (ROADMAP R3.2, SPEC 8.2, 8.4): перемещение, действие локации, выход в фазу II.
// Полный сценарий примера стр. 30–32 — R3.5 / R4.3.
import { expect, test, type Page } from '@playwright/test';

const heading = (page: Page) => page.locator('.wizard-node h2');
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name });

test('фаза I: перемещение с иконками, выслеживание и обратно, затем фаза II', async ({
  page,
}, testInfo) => {
  await page.goto('turn/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);

  await button(page, /^2 игрока/).click();
  await button(page, /^Медведь/).click();
  await expect(heading(page)).toHaveText('Ваш ход');
  await button(page, 'Далее →').click();

  await expect(heading(page)).toHaveText('Фаза I. Перемещаетесь?');
  await button(page, /^Да, перемещаюсь/).click();

  await expect(heading(page)).toHaveText('Перемещение в соседнюю локацию');
  await expect(page.locator('.wizard-checklist .wizard-icon svg')).toHaveCount(4);
  await expect(page.locator('.wizard-board')).toBeVisible();
  await button(page, 'Далее →').click();

  await expect(heading(page)).toHaveText('Вы в новой локации');
  await button(page, /^Действие локации/).click();
  await expect(page.locator('.wizard-option .wizard-icon svg')).toHaveCount(7);
  await testInfo.attach('p1-loc-action', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await button(page, /^Задание на выслеживание/).click();

  await expect(heading(page)).toHaveText('Задание на выслеживание');
  // Шаги действия из коллекции location-actions + напоминание узла.
  await expect(page.locator('.wizard-checklist')).toContainText('Сразу возьмите 1 золото');
  await expect(page.locator('.wizard-checklist')).toContainText('1 раз за ход');
  await button(page, 'Далее →').click();

  await expect(heading(page)).toHaveText('Вы в новой локации');
  await button(page, /^Закончить фазу I/).click();
  await expect(heading(page)).toHaveText('Фаза II: одно действие');
});
