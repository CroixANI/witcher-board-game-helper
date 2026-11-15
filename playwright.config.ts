// E2E (SPEC 13.3): собранный сайт через `astro preview`, два мобильных движка.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const CI = !!process.env.CI;
// Слеш в конце обязателен: относительные пути (`setup/`) резолвятся внутри base path.
const BASE_URL = `http://localhost:${PORT}/witcher-board-game-helper/`;

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
  projects: [
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } },
    { name: 'iPhone 14', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    // `--ignore-lock`: иначе под AI-агентом (Claude Code и т. п.) Astro сам уводит preview
    // в фон, процесс сразу завершается и Playwright считает сервер упавшим.
    command: `npm run preview -- --port ${PORT} --ignore-lock`,
    url: BASE_URL,
    reuseExistingServer: !CI,
  },
});
