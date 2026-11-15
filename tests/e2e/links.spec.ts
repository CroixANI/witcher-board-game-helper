// Краулер по собранному `dist` (SPEC 13.3, 12.4): каждая страница и каждая внутренняя
// ссылка (href/src) отвечает 200 через preview с base path. Ссылка без base path сюда же —
// preview отдаёт на неё 404.
import { readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const BASE = '/witcher-board-game-helper/';
const DIST = new URL('../../dist/', import.meta.url);

/** Маршруты всех собранных страниц: `rules/meditation/index.html` → `/…/rules/meditation/`. */
function builtPages(): string[] {
  return readdirSync(DIST, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => file.endsWith('index.html'))
    .map((file) => BASE + file.slice(0, -'index.html'.length))
    .sort();
}

const LINK_ATTR = /\s(?:href|src)="([^"]+)"/g;

test('все страницы dist и их внутренние ссылки отвечают 200', async ({
  request,
  baseURL,
}, testInfo) => {
  // Ссылки не зависят от устройства — хватает одного проекта.
  test.skip(testInfo.project.name !== 'Pixel 7', 'проверяется один раз');
  const origin = new URL(baseURL!).origin;

  const pages = builtPages();
  expect(pages).toContain(BASE);
  expect(pages).toContain(`${BASE}setup/`);

  const links = new Map<string, string>(); // ссылка → первая страница, где она встретилась
  for (const path of pages) {
    const res = await request.get(origin + path);
    expect(res.status(), path).toBe(200);
    for (const [, raw = ''] of (await res.text()).matchAll(LINK_ATTR)) {
      const target = new URL(raw.replaceAll('&amp;', '&'), origin + path);
      if (target.origin !== origin) continue; // внешние ссылки не проверяем
      target.hash = '';
      if (!links.has(target.href)) links.set(target.href, path);
    }
  }

  const broken: string[] = [];
  for (const [href, from] of links) {
    const path = new URL(href).pathname;
    if (!path.startsWith(BASE)) {
      broken.push(`${path} (без base path) ← ${from}`);
      continue;
    }
    const status = (await request.get(href)).status();
    if (status !== 200) broken.push(`${path} → ${status} ← ${from}`);
  }
  expect(broken).toEqual([]);
});
