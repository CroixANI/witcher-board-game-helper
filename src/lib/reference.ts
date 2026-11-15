// Хелперы справочника и страниц правил (ROADMAP R1.6): подписи страниц, количество компонентов,
// категории фильтра, группировка карточек правил. Чистые функции — без astro:content.

/** «стр. 15», «стр. 22–24», «стр. 4, 6, 16». Повторы убираются, порядок — по возрастанию. */
export function formatPages(page: number | readonly number[]): string {
  const pages = [...new Set([page].flat())].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < pages.length; ) {
    let j = i;
    while (j + 1 < pages.length && pages[j + 1] === pages[j]! + 1) j++;
    // Две соседние страницы — через запятую («10, 11»), три и больше — диапазоном.
    if (j - i >= 2) parts.push(`${pages[i]}–${pages[j]}`);
    else parts.push(...pages.slice(i, j + 1).map(String));
    i = j + 1;
  }
  return `стр. ${parts.join(', ')}`;
}

/** Первая страница — для сортировки. */
export function firstPage(page: number | readonly number[]): number {
  return Math.min(...[page].flat());
}

export type ComponentKind = 'card' | 'token' | 'board' | 'misc';

/** Категории фильтра справочника: «Карты / Жетоны / Прочее». */
export const COMPONENT_CATEGORIES = [
  { id: 'cards', label: 'Карты' },
  { id: 'tokens', label: 'Жетоны' },
  { id: 'other', label: 'Прочее' },
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number]['id'];

export function componentCategory(kind: ComponentKind): ComponentCategory {
  if (kind === 'card') return 'cards';
  if (kind === 'token') return 'tokens';
  return 'other';
}

/** «90», «10 в каждом наборе игрока», «10 — 2 набора по 5». */
export function formatCount(c: { count: number; perPlayer?: boolean; countNote?: string }): string {
  const base = c.perPlayer ? `${c.count} в каждом наборе игрока` : String(c.count);
  return c.countNote ? `${base} — ${c.countNote}` : base;
}

/** Группы карточек правил в порядке хода игры (поле `group` коллекции rules). */
export const RULE_GROUPS = [
  { id: 'basics', label: 'Основы' },
  { id: 'setup', label: 'Подготовка' },
  { id: 'phase1', label: 'Фаза I: перемещение и действия' },
  { id: 'phase2', label: 'Фаза II: битва, медитация, исследование' },
  { id: 'battle', label: 'Битва' },
  { id: 'phase3', label: 'Фаза III: добор и новая карта' },
  { id: 'trophies', label: 'Трофеи и победа' },
  { id: 'location-actions', label: 'Действия локаций' },
  { id: 'schools', label: 'Школы' },
] as const;

export type RuleGroup = (typeof RULE_GROUPS)[number]['id'];

export function ruleGroupLabel(group: RuleGroup): string {
  return RULE_GROUPS.find((g) => g.id === group)!.label;
}

type RuleLike = { id: string; data: { group: RuleGroup; title: string; page: number | number[] } };

/** Карточки по группам в порядке RULE_GROUPS; внутри — по первой странице, затем по заголовку. Пустые группы опускаются. */
export function groupRules<T extends RuleLike>(
  rules: readonly T[],
): { id: RuleGroup; label: string; rules: T[] }[] {
  return RULE_GROUPS.map(({ id, label }) => ({
    id,
    label,
    rules: rules
      .filter((r) => r.data.group === id)
      .sort(
        (a, b) =>
          firstPage(a.data.page) - firstPage(b.data.page) ||
          a.data.title.localeCompare(b.data.title, 'ru'),
      ),
  })).filter((g) => g.rules.length > 0);
}
