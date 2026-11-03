import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Внутренние ссылки строятся только через url() из src/lib/url.ts (SPEC 12.4):
// абсолютный путь в href/src потеряет base path GitHub Pages.
const noRootRelativeLinks = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'JSXAttribute[name.name=/^(href|src|action)$/][value.value=/^\\u002F(?!\\u002F)/]',
      message: 'Абсолютный путь теряет base path. Используйте url() из src/lib/url.ts.',
    },
  ],
};

export default defineConfig([
  { ignores: ['dist/', '.astro/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  astro.configs['jsx-a11y-recommended'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  { files: ['**/*.astro', '**/*.tsx'], rules: noRootRelativeLinks },
]);
