// Хелперы страниц FAQ (SPEC 10, ROADMAP R5.1): группы по фазе и подпись источника.
// Чистые функции — без astro:content.
import { formatPages } from './reference';

/** Группы списка `/faq/` в порядке хода игры (поле `phase` записи FAQ). */
export const FAQ_PHASES = [
  { id: 'setup', label: 'Подготовка' },
  { id: 'phase1', label: 'Фаза I: перемещение и действия' },
  { id: 'phase2', label: 'Фаза II: медитация и исследование' },
  { id: 'battle', label: 'Битва' },
  { id: 'phase3', label: 'Фаза III: добор и новая карта' },
  { id: 'general', label: 'Общие вопросы' },
] as const;

export type FaqPhase = (typeof FAQ_PHASES)[number]['id'];

type FaqLike = {
  readonly id: string;
  readonly data: { readonly phase: FaqPhase; readonly question: string };
};

/** Непустые группы в порядке `FAQ_PHASES`, внутри — по алфавиту вопроса. */
export function groupFaq<E extends FaqLike>(entries: readonly E[]) {
  return FAQ_PHASES.map((p) => ({
    ...p,
    entries: entries
      .filter((e) => e.data.phase === p.id)
      .toSorted((a, b) => a.data.question.localeCompare(b.data.question, 'ru')),
  })).filter((g) => g.entries.length > 0);
}

export function faqPhaseLabel(phase: FaqPhase): string {
  return FAQ_PHASES.find((p) => p.id === phase)?.label ?? phase;
}

export type FaqSource = {
  readonly source: 'rulebook' | 'official-faq' | 'house';
  readonly sourceRef?: string | undefined;
  readonly page?: number | undefined;
};

/**
 * Строка «Источник»: страница — всегда как страница книги правил, `sourceRef` — отдельно
 * при любом `source`. «Книга правил, стр. 18 · Офиц. FAQ, п. 11»,
 * «Офиц. FAQ, Базовая игра, п. 1 · Книга правил, стр. 22», «Договорённость стола».
 */
export function faqSourceLabel({ source, sourceRef, page }: FaqSource): string {
  const book = page === undefined ? undefined : `Книга правил, ${formatPages(page)}`;
  const parts =
    source === 'rulebook'
      ? [book ?? 'Книга правил', sourceRef]
      : [
          source === 'official-faq' ? (sourceRef ?? 'Официальный FAQ') : 'Договорённость стола',
          source === 'house' ? sourceRef : undefined,
          book,
        ];
  return parts.filter((p) => p !== undefined).join(' · ');
}
