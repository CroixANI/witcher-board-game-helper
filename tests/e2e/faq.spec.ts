// Страницы FAQ и связка с полем (SPEC 10, 11.5; ROADMAP R5.1).
import { expect, test, type Page } from '@playwright/test';

const SLUG = 'meditation-last-trophy';
const QUESTION = 'Можно ли выиграть, получив последний трофей медитацией?';
const ZONE = 'z-trophy-track';

const hydrated = (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);

test('/faq/: вопрос в группе фазы, якорь #slug, источник, страница и правила', async ({ page }) => {
  await page.goto('faq/');
  const group = page.locator('#phase-phase2');
  await expect(group.getByRole('heading', { level: 2 })).toHaveText(/Фаза II/);
  const item = group.locator(`#${SLUG}`);
  await expect(item.getByRole('heading', { level: 3 })).toHaveText(QUESTION);
  await expect(item).toContainText('Источник: Книга правил, стр. 15');
  await expect(item.getByRole('link', { name: 'Медитация' })).toHaveAttribute(
    'href',
    /\/rules\/meditation\/$/,
  );
  await expect(page.getByText('Сформулируйте вопрос')).toHaveCount(0); // _template.md не в списке

  await item.getByRole('link', { name: QUESTION }).click();
  await expect(page).toHaveURL(new RegExp(`/faq/${SLUG}/$`));
});

test('/faq/[slug]/: канонический вопрос, ссылка назад к группе', async ({ page }) => {
  await page.goto(`faq/${SLUG}/`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION);
  await expect(page.locator('.faq-entry')).toContainText('стр. 15');
  await expect(page.getByRole('link', { name: /← FAQ/ })).toHaveAttribute(
    'href',
    '/witcher-board-game-helper/faq/#phase-phase2',
  );
});

for (const path of ['faq/', `faq/${SLUG}/`]) {
  test(`${path}: «Показать на поле» открывает панель зоны`, async ({ page }) => {
    await page.goto(path);
    await hydrated(page);
    await page.locator(`a.zone-link[data-zone="${ZONE}"]`).click();
    const sheet = page.getByRole('dialog', { name: 'Шкала трофеев' });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator(`[data-highlight="${ZONE}"]`)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
  });
}

test.describe('без JS', () => {
  test.use({ javaScriptEnabled: false });

  test('«Показать на поле» ведёт на /board/#зона', async ({ page }) => {
    await page.goto(`faq/${SLUG}/`);
    await page.getByRole('link', { name: 'Показать на поле: Шкала трофеев' }).click();
    await expect(page).toHaveURL(new RegExp(`/board/#${ZONE}$`));
  });
});

test('/board/: в карточке зоны — «Частые вопросы здесь» со ссылкой на вопрос', async ({ page }) => {
  await page.goto('board/');
  const card = page.locator(`#${ZONE}`);
  await expect(card).toContainText('Частые вопросы здесь');
  await expect(card.getByRole('link', { name: QUESTION })).toHaveAttribute(
    'href',
    `/witcher-board-game-helper/faq/${SLUG}/`,
  );
});
