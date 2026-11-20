// Хелперы страниц FAQ (SPEC 10, ROADMAP R5.1): группы по фазе и подпись источника.
// Чистые функции — без astro:content.

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
};

/** «Книга правил», «Офиц. FAQ, Базовая игра, п. 8», «Договорённость стола». Страница — отдельно. */
export function faqSourceLabel({ source, sourceRef }: FaqSource): string {
  if (source === 'rulebook') return 'Книга правил';
  if (source === 'official-faq') return sourceRef ?? 'Официальный FAQ';
  return 'Договорённость стола';
}
