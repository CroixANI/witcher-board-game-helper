// E2E (SPEC 13.3): собранный сайт через `astro preview`, два мобильных движка.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const CI = !!process.env.CI;
// Слеш в конце обязателен: относительные пути (`setup/`) резолвятся внутри base path.
const BASE_URL = `http://localhost:${PORT}/witcher-board-game-helper/`;
// Облачная сессия Claude Code: браузеры Playwright скачать нельзя (прокси), но есть
// предустановленный Chromium другой сборки. `scripts/session/e2e.sh` передаёт его путь сюда;
// тогда гоняется только Chromium-проект, WebKit (iPhone 14) проверяет CI.
const LOCAL_CHROMIUM = process.env.PW_CHROMIUM_EXECUTABLE;

const pixel7 = {
  name: 'Pixel 7',
  use: {
    ...devices['Pixel 7'],
    ...(LOCAL_CHROMIUM ? { launchOptions: { executablePath: LOCAL_CHROMIUM } } : {}),
  },
};
const iphone14 = { name: 'iPhone 14', use: { ...devices['iPhone 14'] } };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // Отчёт со скриншотами шагов — артефакт CI для ревью.
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: LOCAL_CHROMIUM ? [pixel7] : [pixel7, iphone14],
  webServer: {
    // `--ignore-lock`: иначе под AI-агентом (Claude Code и т. п.) Astro сам уводит preview
    // в фон, процесс сразу завершается и Playwright считает сервер упавшим.
    command: `npm run preview -- --port ${PORT} --ignore-lock`,
    url: BASE_URL,
    reuseExistingServer: !CI,
  },
});
