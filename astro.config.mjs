// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// SPEC 12.4. pagefind и PWA подключаются в M5/M6.
export default defineConfig({
  site: 'https://croixani.github.io',
  base: '/witcher-board-game-helper',
  trailingSlash: 'always',
  integrations: [preact()],
});
