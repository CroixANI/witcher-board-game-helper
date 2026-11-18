// Wizard хода, фаза I (ROADMAP R3.2, SPEC 8.2, 8.4): перемещение, действие локации, выход в фазу II.
// Пример стр. 30–32: шаги 1–9 SPEC 17.1 (R3.5); шаги битвы 10–21 — R4.3.
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

/** Нажать вариант, затем «Далее →» на шаге, который он открыл. */
async function doStep(page: Page, option: RegExp) {
  await button(page, option).click();
  await button(page, 'Далее →').click();
}

test('пример хода стр. 30–32, шаги 1–9: фаза I до битвы; затем ход через исследование', async ({
  page,
}) => {
  await page.goto('turn/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await button(page, /^2 игрока/).click();
  await button(page, /^Медведь/).click();

  // 1. Начало хода в Венгерберге: действие там нельзя, сразу перемещение.
  await expect(heading(page)).toHaveText('Ваш ход');
  await button(page, 'Далее →').click();
  // 2. Водная карта → Бан Ард.
  await doStep(page, /^Да, перемещаюсь/);
  const arrived = () => expect(heading(page)).toHaveText('Вы в новой локации');
  await arrived();
  // 3. Бан Ард: повышение навыка (алхимия → эликсир).
  await button(page, /^Действие локации/).click();
  await doStep(page, /^Повышение навыка/);
  await arrived();
  // 4. Горная карта → Каэр Морхен.
  await doStep(page, /^Переместиться ещё/);
  await arrived();
  // 5. Покер с ведьмаком.
  await button(page, /^Покер с ведьмаком/).click();
  await doStep(page, /^Да, играем/);
  await arrived();
  // 6. Тренировка защиты в чужой школе.
  await button(page, /^Действие локации/).click();
  await doStep(page, /^Тренировка в школе/);
  await arrived();
  // 7. Джокер → Хенгфорс.
  await doStep(page, /^Переместиться ещё/);
  await arrived();
  // 8. Хенгфорс: задание на выслеживание.
  await button(page, /^Действие локации/).click();
  await doStep(page, /^Задание на выслеживание/);
  await arrived();
  // 9. Конец фазы I, битва.
  await button(page, /^Закончить фазу I/).click();
  await expect(heading(page)).toHaveText('Фаза II: одно действие');
  await button(page, /^Битва/).click();
  await expect(heading(page)).toHaveText('С кем битва?');
  await button(page, /^Монстр/).click();
  await expect(heading(page)).toHaveText('Особая способность монстра');

  // Битва целиком — R4.3. Здесь отказ от неё и исследование до конца хода.
  await button(page, /^Не могу/).click();
  await expect(heading(page)).toHaveText('Фаза II: одно действие');
  await button(page, /^Исследование/).click();
  await doStep(page, /^Окрестности/);
  await doStep(page, /^Задание/);
  for (const title of [
    'Фаза III: сбросьте лишнее',
    'Доберите до трёх',
    'Возьмите карту из ряда',
    'Восполните ряд',
  ]) {
    await expect(heading(page)).toHaveText(title);
    await button(page, 'Далее →').click();
  }
  await expect(heading(page)).toHaveText('Ход завершён');
  await button(page, 'Мой следующий ход').click();
  // Снова t-start, школа и число игроков не спрашиваются заново.
  await expect(heading(page)).toHaveText('Ваш ход');
  await expect(page.locator('.school-badge__name')).toHaveText('Школа Медведя');
});

test('битва с монстром при 3 игроках: кто выбирает атаку, поражение, фаза III с добором на 1 меньше', async ({
  page,
}) => {
  await page.goto('turn/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await button(page, /^3 игрока/).click();
  await button(page, /^Волк/).click();
  await button(page, 'Далее →').click();
  await button(page, /^Нет/).click();
  await button(page, /^Битва/).click();
  await button(page, /^Монстр/).click();
  await doStep(page, /^Условия нет/);
  await expect(heading(page)).toHaveText('Кто ходит первым?');
  await button(page, /^Нет — первым ходит монстр/).click();

  const hint = page.locator('.wizard-loop-hint');
  await expect(heading(page)).toHaveText('Ход монстра');
  await expect(page.locator('.wizard-loop-meta')).toContainText('Ход 1');
  await expect(hint).toContainText('игрок справа от вас');
  await button(page, /^Ход ведьмака/).click();
  await expect(heading(page)).toHaveText('Ход ведьмака');
  await expect(hint).toHaveCount(0);
  await button(page, /^Ход монстра/).click();
  await expect(page.locator('.wizard-loop-meta')).toContainText('Ход 3');
  await expect(hint).toContainText('игрок слева от вас');

  await button(page, 'Битва окончена').click();
  await expect(heading(page)).toHaveText('Чем кончилась битва?');
  await button(page, /^Поражение/).click();
  await expect(heading(page)).toHaveText('Поражение');
  await button(page, 'Далее →').click();
  await expect(heading(page)).toHaveText('Завершение битвы');
  await expect(page.locator('.wizard-board')).toBeVisible();
  await button(page, 'Далее →').click();
  await expect(heading(page)).toHaveText('Фаза III: сбросьте лишнее');
  await expect(page.locator('.wizard-checklist')).toContainText('рука пуста');
  await button(page, 'Далее →').click();
  await expect(page.locator('.wizard-checklist')).toContainText('на 1 карту меньше');
});
