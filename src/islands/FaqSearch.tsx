// Поиск и фильтры FAQ (SPEC 10.2, ROADMAP R5.2). Без JS на `/faq/` виден полный список.
// С JS: фаза и тег скрывают лишние вопросы в готовом списке, текстовый запрос идёт
// в Pagefind (JS API, без стандартного UI) и показывает найденное вместо списка.
// Состояние живёт в URL: `?q=…&phase=battle&tag=трофеи`.
import { useEffect, useState } from 'preact/hooks';
import {
  faqQueryString,
  filterFaq,
  pagefindFilters,
  parseFaqQuery,
  type FaqItem,
  type FaqQuery,
} from '../lib/faq-search';
import type { FaqPhase } from '../lib/faq';
import { url } from '../lib/url';
import './FaqSearch.css';

/** Часть JS API Pagefind 1.x, которой пользуется остров. */
export type PagefindResultData = {
  readonly url: string;
  readonly excerpt: string;
  readonly meta: { readonly title?: string };
  readonly sub_results?: readonly { readonly url: string; readonly title: string }[];
};
export type Pagefind = {
  search(
    query: string,
    options: { filters: Record<string, string> },
  ): Promise<{ results: readonly { id: string; data(): Promise<PagefindResultData> }[] }>;
};

/** Пустой запрос — список; `loading`/`error` — состояние Pagefind. */
type Found =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' }
  | { readonly kind: 'done'; readonly results: readonly PagefindResultData[] };

const MAX_RESULTS = 10;
const MAX_SUB_RESULTS = 3;
const DEBOUNCE_MS = 200;

let pagefindPromise: Promise<Pagefind> | undefined;

/** Индекс собирается при `astro build` в `<base>pagefind/`; в `astro dev` его может не быть. */
function loadPagefind(): Promise<Pagefind> {
  return (pagefindPromise ??= (async () => {
    const pf = (await import(/* @vite-ignore */ url('pagefind/pagefind.js'))) as Pagefind & {
      options(o: { baseUrl: string }): Promise<void>;
    };
    // URL в индексе — от корня `dist/`; base path сайта добавляет сам Pagefind.
    await pf.options({ baseUrl: import.meta.env.BASE_URL });
    return pf;
  })().catch((e: unknown) => {
    pagefindPromise = undefined;
    throw e;
  }));
}

interface Props {
  items: readonly FaqItem[];
  phases: readonly { readonly id: FaqPhase; readonly label: string }[];
  tags: readonly string[];
  /** Для тестов; по умолчанию — `pagefind.js` сайта. */
  pagefind?: () => Promise<Pagefind>;
}

const EMPTY: FaqQuery = { q: '', phase: undefined, tag: undefined };

export function FaqSearch({ items, phases, tags, pagefind = loadPagefind }: Props) {
  // SSR и гидрация — без фильтров (как список без JS); URL читается после монтирования.
  const [query, setQuery] = useState<FaqQuery>(EMPTY);
  const [ready, setReady] = useState(false);
  const [found, setFound] = useState<Found>({ kind: 'idle' });
  const searching = query.q !== '';
  const visible = filterFaq(items, query);

  useEffect(() => {
    setQuery(parseFaqQuery(location.search, tags));
    setReady(true);
  }, [tags]);

  useEffect(() => {
    if (!ready) return;
    const next = location.pathname + faqQueryString(query) + location.hash;
    if (next !== location.pathname + location.search + location.hash)
      history.replaceState(history.state, '', next);
  }, [query, ready]);

  // Pagefind недоступен — вместо результатов остаётся список с фильтрами фазы и тега.
  const listHidden = searching && found.kind !== 'error';
  useEffect(() => {
    if (ready) applyToList(visible, listHidden);
  }, [query.phase, query.tag, listHidden, ready]);

  useEffect(() => {
    if (!ready || !searching) {
      setFound({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setFound((f) => (f.kind === 'done' ? f : { kind: 'loading' }));
    const timer = setTimeout(async () => {
      try {
        const pf = await pagefind();
        const { results } = await pf.search(query.q, { filters: pagefindFilters(query) });
        const data = await Promise.all(results.slice(0, MAX_RESULTS).map((r) => r.data()));
        if (!cancelled) setFound({ kind: 'done', results: data });
      } catch {
        if (!cancelled) setFound({ kind: 'error' });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query.q, query.phase, query.tag, ready]);

  const set = (patch: Partial<FaqQuery>) => setQuery((q) => ({ ...q, ...patch }));

  return (
    <div class="faq-search">
      <form role="search" class="faq-search__form" onSubmit={(e) => e.preventDefault()}>
        <label for="faq-search-input">Поиск по FAQ и полю</label>
        <input
          id="faq-search-input"
          type="search"
          value={query.q}
          placeholder="Например: медитация"
          autocomplete="off"
          onInput={(e) => set({ q: e.currentTarget.value })}
        />
      </form>

      <Chips
        label="Фаза"
        options={phases.map((p) => ({ value: p.id, label: p.label }))}
        current={query.phase}
        onChange={(phase) => set({ phase })}
      />
      {tags.length > 0 && (
        <Chips
          label="Тег"
          options={tags.map((t) => ({ value: t, label: t }))}
          current={query.tag}
          onChange={(tag) => set({ tag })}
        />
      )}

      <p class="faq-search__status" role="status">
        {ready && statusText(searching, found, visible.size, items.length)}
      </p>

      {searching && found.kind === 'done' && found.results.length > 0 && (
        <ul class="faq-search__results">
          {found.results.map((r) => (
            <SearchResult key={r.url} result={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function statusText(searching: boolean, found: Found, shown: number, total: number): string {
  if (!searching) {
    if (shown === total) return '';
    return shown === 0
      ? 'Нет вопросов с такими фильтрами.'
      : `Показано вопросов: ${shown} из ${total}.`;
  }
  switch (found.kind) {
    case 'idle':
    case 'loading':
      return 'Ищем…';
    case 'error':
      return 'Поиск сейчас недоступен. Список вопросов — ниже без фильтра по тексту.';
    case 'done':
      return found.results.length === 0
        ? 'Ничего не найдено.'
        : `Найдено: ${found.results.length}.`;
  }
}

function SearchResult({ result }: { result: PagefindResultData }) {
  const anchors = (result.sub_results ?? [])
    .filter((s) => s.url.includes('#'))
    .slice(0, MAX_SUB_RESULTS);
  return (
    <li class="faq-search__result">
      <a href={result.url}>{result.meta.title ?? result.url}</a>
      {anchors.length > 0 ? (
        <ul>
          {anchors.map((s) => (
            <li key={s.url}>
              <a href={s.url}>{s.title}</a>
            </li>
          ))}
        </ul>
      ) : (
        // Pagefind экранирует текст и оборачивает совпадения в <mark>.
        <p dangerouslySetInnerHTML={{ __html: result.excerpt }} />
      )}
    </li>
  );
}

function Chips<T extends string>(props: {
  label: string;
  options: readonly { value: T; label: string }[];
  current: T | undefined;
  onChange: (value: T | undefined) => void;
}) {
  const { label, options, current, onChange } = props;
  return (
    <fieldset class="faq-search__chips">
      <legend>{label}</legend>
      <button
        type="button"
        aria-pressed={current === undefined}
        onClick={() => onChange(undefined)}
      >
        Все
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={current === o.value}
          onClick={() => onChange(current === o.value ? undefined : o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}

/**
 * Готовый список `/faq/` (разметка Astro): скрыть неподходящие вопросы, пустые группы
 * и их пункты оглавления; во время текстового поиска список скрыт целиком.
 */
function applyToList(visible: ReadonlySet<string>, hidden: boolean) {
  const list = document.querySelector<HTMLElement>('[data-faq-list]');
  if (list === null) return;
  list.hidden = hidden;
  for (const li of list.querySelectorAll<HTMLElement>('[data-faq-item]'))
    li.hidden = !visible.has(li.dataset['faqItem'] ?? '');
  for (const group of list.querySelectorAll<HTMLElement>('[data-faq-group]')) {
    group.hidden = group.querySelector('[data-faq-item]:not([hidden])') === null;
    const toc = list.querySelector<HTMLElement>(`[data-faq-toc="${group.dataset['faqGroup']}"]`);
    if (toc) toc.hidden = group.hidden;
  }
}
