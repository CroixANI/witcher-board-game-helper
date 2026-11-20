// Поиск и фильтры FAQ (SPEC 10.2, ROADMAP R5.2): состояние из URL, фильтр списка без запроса,
// фильтры для Pagefind. Чистые функции — без DOM и без Pagefind.
import { FAQ_PHASES, type FaqPhase } from './faq';

export type FaqQuery = {
  readonly q: string;
  readonly phase: FaqPhase | undefined;
  readonly tag: string | undefined;
};

/** Вопрос в списке `/faq/`: всё, что нужно фильтру без поиска. */
export type FaqItem = {
  readonly slug: string;
  readonly phase: FaqPhase;
  readonly tags: readonly string[];
};

const isPhase = (value: string): value is FaqPhase => FAQ_PHASES.some((p) => p.id === value);

/**
 * `?q=…&phase=battle&tag=трофеи` → состояние. Неизвестная фаза или тег отбрасываются,
 * чтобы старая ссылка не давала пустой список без объяснения.
 */
export function parseFaqQuery(search: string, knownTags: readonly string[]): FaqQuery {
  const params = new URLSearchParams(search);
  const phase = params.get('phase') ?? '';
  const tag = params.get('tag') ?? '';
  return {
    q: (params.get('q') ?? '').trim(),
    phase: isPhase(phase) ? phase : undefined,
    tag: knownTags.includes(tag) ? tag : undefined,
  };
}

/** Состояние → query string (`?…` или пустая строка); пустые поля не пишутся. */
export function faqQueryString({ q, phase, tag }: FaqQuery): string {
  const params = new URLSearchParams();
  if (q.trim() !== '') params.set('q', q.trim());
  if (phase !== undefined) params.set('phase', phase);
  if (tag !== undefined) params.set('tag', tag);
  const s = params.toString();
  return s === '' ? '' : `?${s}`;
}

/** Slug'и вопросов, подходящих под фазу и тег (без текстового запроса). */
export function filterFaq(
  items: readonly FaqItem[],
  { phase, tag }: Pick<FaqQuery, 'phase' | 'tag'>,
): Set<string> {
  return new Set(
    items
      .filter(
        (i) =>
          (phase === undefined || i.phase === phase) && (tag === undefined || i.tags.includes(tag)),
      )
      .map((i) => i.slug),
  );
}

/** Фильтры Pagefind (`data-pagefind-filter` на `/faq/[slug]/`). */
export function pagefindFilters({ phase, tag }: Pick<FaqQuery, 'phase' | 'tag'>) {
  return {
    ...(phase === undefined ? {} : { phase }),
    ...(tag === undefined ? {} : { tag }),
  };
}

/** Все теги вопросов без повторов, по алфавиту. */
export function faqTags(items: readonly FaqItem[]): string[] {
  return [...new Set(items.flatMap((i) => i.tags))].toSorted((a, b) => a.localeCompare(b, 'ru'));
}
