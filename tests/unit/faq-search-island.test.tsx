// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { FaqSearch, type Pagefind, type PagefindResultData } from '../../src/islands/FaqSearch';
import { FAQ_PHASES } from '../../src/lib/faq';
import type { FaqItem } from '../../src/lib/faq-search';

const items: FaqItem[] = [
  { slug: 'a', phase: 'phase2', tags: ['трофеи'] },
  { slug: 'b', phase: 'battle', tags: ['ставки'] },
];
const tags = ['ставки', 'трофеи'];

/** Разметка списка `/faq/`, как её отдаёт Astro. */
const LIST = `
  <div data-faq-list>
    <nav><ul><li data-faq-toc="phase2">II</li><li data-faq-toc="battle">Битва</li></ul></nav>
    <section data-faq-group="phase2"><ul><li data-faq-item="a">A</li></ul></section>
    <section data-faq-group="battle"><ul><li data-faq-item="b">B</li></ul></section>
  </div>`;

const el = (selector: string) => document.querySelector<HTMLElement>(selector)!;

function fakePagefind(results: PagefindResultData[]) {
  const search = vi.fn<Pagefind['search']>(async () => ({
    results: results.map((r) => ({ id: r.url, data: async () => r })),
  }));
  return { search, load: async (): Promise<Pagefind> => ({ search }) };
}

function setup(search = '', pagefind = fakePagefind([]).load) {
  history.replaceState(null, '', `/faq/${search}`);
  document.body.innerHTML = LIST;
  const host = document.createElement('div');
  document.body.prepend(host);
  return render(<FaqSearch items={items} phases={FAQ_PHASES} tags={tags} pagefind={pagefind} />, {
    container: host,
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(cleanup);

describe('FaqSearch: фильтры списка', () => {
  it('без параметров список не трогается', async () => {
    setup();
    await waitFor(() => expect(el('[data-faq-list]').hidden).toBe(false));
    expect(el('[data-faq-item="a"]').hidden).toBe(false);
    expect(el('[data-faq-item="b"]').hidden).toBe(false);
  });

  it('?phase=battle из URL скрывает другие фазы, их группы и оглавление', async () => {
    setup('?phase=battle');
    await waitFor(() => expect(el('[data-faq-item="a"]').hidden).toBe(true));
    expect(el('[data-faq-item="b"]').hidden).toBe(false);
    expect(el('[data-faq-group="phase2"]').hidden).toBe(true);
    expect(el('[data-faq-toc="phase2"]').hidden).toBe(true);
    expect(screen.getByRole('button', { name: 'Битва' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe('Показано вопросов: 1 из 2.');
  });

  it('чип тега обновляет список и URL; повторный тап снимает фильтр', async () => {
    setup();
    const chip = await screen.findByRole('button', { name: 'трофеи' });
    fireEvent.click(chip);
    await waitFor(() => expect(location.search).toBe(`?tag=${encodeURIComponent('трофеи')}`));
    expect(el('[data-faq-item="b"]').hidden).toBe(true);
    fireEvent.click(chip);
    await waitFor(() => expect(location.search).toBe(''));
    expect(el('[data-faq-item="b"]').hidden).toBe(false);
  });

  it('фаза без вопросов — сообщение вместо пустого экрана', async () => {
    setup('?phase=setup');
    expect((await screen.findByRole('status')).textContent).toBe(
      'Нет вопросов с такими фильтрами.',
    );
  });
});

describe('FaqSearch: текстовый поиск через Pagefind', () => {
  it('показывает результаты, передаёт фильтры и прячет список', async () => {
    const pf = fakePagefind([
      {
        url: '/base/faq/a/',
        meta: { title: 'Вопрос A' },
        excerpt: 'про <mark>медитацию</mark>',
        sub_results: [{ url: '/base/faq/a/', title: 'Вопрос A', locations: [3] }],
      },
    ]);
    setup('?phase=phase2', pf.load);
    fireEvent.input(await screen.findByLabelText('Поиск по FAQ и полю'), {
      target: { value: 'медитация' },
    });
    const link = await screen.findByRole('link', { name: 'Вопрос A' });
    expect(link.getAttribute('href')).toBe('/base/faq/a/');
    expect(link.closest('li')!.querySelector('mark')!.textContent).toBe('медитацию');
    expect(pf.search).toHaveBeenLastCalledWith('медитация', { filters: { phase: 'phase2' } });
    expect(el('[data-faq-list]').hidden).toBe(true);
    expect(location.search).toBe(`?q=${encodeURIComponent('медитация')}&phase=phase2`);
  });

  it('у страницы поля — ссылки на якоря зон (sub-results)', async () => {
    const pf = fakePagefind([
      {
        url: '/base/board/',
        meta: { title: 'Поле' },
        excerpt: '…',
        sub_results: [
          { url: '/base/board/#z-action-row', title: 'Ряд карт действий', locations: [5] },
          { url: '/base/board/', title: 'Поле', locations: [1] },
        ],
      },
    ]);
    setup('?q=ряд', pf.load);
    const link = await screen.findByRole('link', { name: 'Ряд карт действий' });
    expect(link.getAttribute('href')).toBe('/base/board/#z-action-row');
  });

  it('sub-results: сверху разделы с наибольшим числом совпадений, не больше 3', async () => {
    const zone = (id: string, hits: number) => ({
      url: `/base/board/#${id}`,
      title: id,
      locations: Array.from({ length: hits }, (_, i) => i),
    });
    const pf = fakePagefind([
      {
        url: '/base/board/',
        meta: { title: 'Поле' },
        excerpt: '…',
        sub_results: [
          zone('z-1', 1),
          zone('z-2', 1),
          zone('z-3', 14),
          zone('z-4', 11),
          zone('z-5', 6),
        ],
      },
    ]);
    setup('?q=монстр', pf.load);
    await screen.findByRole('link', { name: 'z-3' });
    const titles = [...document.querySelectorAll('.faq-search__result li a')].map(
      (a) => a.textContent,
    );
    expect(titles).toEqual(['z-3', 'z-4', 'z-5']);
  });

  it('Pagefind не загрузился — сообщение, список снова виден', async () => {
    setup('?q=что-то', () => Promise.reject(new Error('404')));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/недоступен/));
    await waitFor(() => expect(el('[data-faq-list]').hidden).toBe(false));
  });

  it('ничего не найдено', async () => {
    setup('?q=абв');
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Ничего не найдено.'));
  });
});
