// Конфиг E2E: в облачной сессии — предустановленный Chromium без WebKit (scripts/session/e2e.sh).
import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(executable?: string) {
  vi.resetModules();
  vi.stubEnv('PW_CHROMIUM_EXECUTABLE', executable ?? '');
  if (executable === undefined) delete process.env.PW_CHROMIUM_EXECUTABLE;
  return (await import('../../playwright.config')).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('playwright.config', () => {
  it('по умолчанию — Pixel 7 и iPhone 14 на браузерах Playwright', async () => {
    const config = await load();
    expect(config.projects?.map((p) => p.name)).toEqual(['Pixel 7', 'iPhone 14']);
    expect(config.projects?.[0]?.use?.launchOptions).toBeUndefined();
  });

  it('PW_CHROMIUM_EXECUTABLE — только Pixel 7 с этим исполняемым файлом', async () => {
    const config = await load('/opt/pw-browsers/chrome-headless-shell');
    expect(config.projects?.map((p) => p.name)).toEqual(['Pixel 7']);
    expect(config.projects?.[0]?.use?.launchOptions).toEqual({
      executablePath: '/opt/pw-browsers/chrome-headless-shell',
    });
    expect(config.projects?.[0]?.use?.defaultBrowserType).toBe('chromium');
  });
});
