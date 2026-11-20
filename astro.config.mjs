// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import preact from '@astrojs/preact';
import pagefind from 'astro-pagefind';
import { zoneLinksPlugin } from './src/lib/zone-links.ts';

const base = '/witcher-board-game-helper';

// SPEC 12.4. Pagefind — поиск FAQ и поля (R5.2), PWA — M6.
// Markdown — Sätteri (процессор Astro 7 по умолчанию) + ссылки `zone:` (SPEC 11.5.2).
export default defineConfig({
  site: 'https://croixani.github.io',
  base,
  trailingSlash: 'always',
  integrations: [preact(), pagefind()],
  markdown: {
    processor: satteri({ mdastPlugins: [zoneLinksPlugin({ base })] }),
  },
});
