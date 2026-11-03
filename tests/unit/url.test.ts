import { describe, expect, it } from 'vitest';
import { joinBase } from '../../src/lib/url';

const BASE = '/witcher-board-game-helper/';

describe('joinBase', () => {
  it('корень сайта', () => {
    expect(joinBase(BASE)).toBe(BASE);
    expect(joinBase(BASE, '')).toBe(BASE);
    expect(joinBase(BASE, '/')).toBe(BASE);
  });

  it('добавляет завершающий слэш страницам', () => {
    expect(joinBase(BASE, 'setup')).toBe('/witcher-board-game-helper/setup/');
    expect(joinBase(BASE, 'turn/not-my-turn')).toBe('/witcher-board-game-helper/turn/not-my-turn/');
  });

  it('не дублирует слэши', () => {
    expect(joinBase(BASE, '/setup/')).toBe('/witcher-board-game-helper/setup/');
    expect(joinBase(BASE, '//faq')).toBe('/witcher-board-game-helper/faq/');
  });

  it('работает с base без завершающего слэша', () => {
    expect(joinBase('/witcher-board-game-helper', 'rules')).toBe(
      '/witcher-board-game-helper/rules/',
    );
    expect(joinBase('/', 'rules')).toBe('/rules/');
  });

  it('не добавляет слэш файлам', () => {
    expect(joinBase(BASE, 'favicon.svg')).toBe('/witcher-board-game-helper/favicon.svg');
    expect(joinBase(BASE, '/pagefind/pagefind.js')).toBe(
      '/witcher-board-game-helper/pagefind/pagefind.js',
    );
  });

  it('сохраняет hash и query после слэша страницы', () => {
    expect(joinBase(BASE, 'faq#hand-limit')).toBe('/witcher-board-game-helper/faq/#hand-limit');
    expect(joinBase(BASE, 'faq/?q=битва')).toBe('/witcher-board-game-helper/faq/?q=битва');
    expect(joinBase(BASE, '#top')).toBe('/witcher-board-game-helper/#top');
  });
});
