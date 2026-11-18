/**
 * Данные для острова `WizardIsland` (ROADMAP R2.2): граф и всё, что нужно для отрисовки узлов,
 * в сериализуемом виде. Страница собирает их на этапе сборки (Markdown правил уже в HTML)
 * и передаёт острову пропсом — в браузере коллекции Astro недоступны.
 */
import {
  isSchool,
  type Condition,
  type GraphName,
  type Option,
  type School,
  type WizardNode,
} from './wizard-engine';

export type Pages = number | readonly number[];
export type Phase = 'setup' | 'phase1' | 'phase2' | 'battle' | 'phase3' | 'general';

/** Иконка из контента (`actions/move-joker`) и её готовая разметка: реестр SVG не попадает в JS острова. */
type WithIcon = { readonly icon?: string | undefined; readonly iconSvg?: string | undefined };

export type ViewChecklistItem = WithIcon & {
  readonly text: string;
  readonly showIf?: Condition | undefined;
  readonly rule?: string | undefined;
};
export type ViewOption = Option & WithIcon & { readonly hint?: string | undefined };

/** Узел wizard'а для UI: ссылки на правила и компоненты — строковые id. */
export type ViewNode = Omit<WizardNode, 'options' | 'yes' | 'no'> & {
  readonly title: string;
  readonly phase: Phase;
  readonly pages: Pages;
  readonly rules?: readonly string[] | undefined;
  readonly components?: readonly string[] | undefined;
  readonly note?: string | undefined;
  readonly warning?: string | undefined;
  readonly checklist?: readonly ViewChecklistItem[] | undefined;
  readonly zones?: readonly string[] | undefined;
  /** Действие локации (`la-*`): его шаги из коллекции `location-actions` идут в начало чек-листа. */
  readonly locationAction?: string | undefined;
  /** Интерактивный блок шага (`step`), например кнопка 🎲 в s09. */
  readonly widget?: 'random-first-player' | undefined;
  /** Текст `info`-узла. */
  readonly body?: string | undefined;
  /** Подробный текст узла в HTML (тело Markdown-файла подготовки). */
  readonly detailsHtml?: string | undefined;
  readonly question?: string | undefined;
  readonly actorLabel?: string | undefined;
  /** `loop` хода монстра: подсказка, кто выбирает тип атаки (SPEC 8.5). */
  readonly monsterAttack?: boolean | undefined;
  readonly outcome?: 'turn-complete' | 'game-won' | 'setup-complete' | undefined;
  readonly options?: readonly ViewOption[] | undefined;
  readonly yes?: Omit<ViewOption, 'increment'> | undefined;
  readonly no?: Omit<ViewOption, 'increment'> | undefined;
};

export type RuleView = {
  readonly id: string;
  readonly title: string;
  readonly page: Pages;
  readonly summary: string;
  readonly important: boolean;
  readonly html: string;
};

export type ComponentView = {
  readonly id: string;
  readonly name: string;
  /** Готовая inline-разметка иконки: реестр SVG не попадает в JS острова. */
  readonly iconSvg: string;
  readonly howToTell: string;
};

/** Специализация школы для `SchoolBadge` (SPEC 9.3). */
export type SchoolView = {
  readonly id: School;
  readonly name: string;
  readonly specialization: string;
  readonly timing: string;
  readonly effect: string;
  readonly page: Pages;
  readonly color: string;
};

export type WizardData = {
  readonly graph: GraphName;
  /** Заголовок wizard'а в верхнем баре («Подготовка»). */
  readonly title: string;
  readonly entry: string;
  readonly nodes: readonly ViewNode[];
  /** Порядок узлов для индикатора «N/M»; без него прогресс не показывается (граф хода). */
  readonly progress?: readonly string[] | undefined;
  readonly rules: Readonly<Record<string, RuleView>>;
  readonly components: Readonly<Record<string, ComponentView>>;
  /** Школы для бейджа специализации — только у графа хода. */
  readonly schools?: Readonly<Partial<Record<School, SchoolView>>> | undefined;
  /** Панель «Не забудь» (SPEC 8.9) — только у графа хода. */
  readonly reminders?: readonly ReminderView[] | undefined;
};

/** Пункт панели «Не забудь» (SPEC 8.9): текст, страница и ссылка на карточку правила. */
export type ReminderView = {
  readonly id: string;
  readonly text: string;
  readonly page: Pages;
  readonly phases: readonly Phase[];
  readonly rule: { readonly id: string; readonly title: string };
};

/** Ссылка коллекции: в Astro — `{ collection, id }`, в валидаторе без Astro — строка. */
export type Ref = string | { readonly id: string };
export const refId = (ref: Ref): string => (typeof ref === 'string' ? ref : ref.id);

/** Узел контента (ссылки — объекты Astro) → узел для UI. */
export function toViewNode<
  N extends WizardNode & {
    rules?: readonly Ref[];
    components?: readonly Ref[];
    checklist?: readonly (Omit<ViewChecklistItem, 'rule'> & { rule?: Ref | undefined })[];
  },
>(node: N, detailsHtml?: string): ViewNode {
  const { rules, components, checklist, ...rest } = node;
  return {
    ...(rest as unknown as ViewNode),
    ...(rules && { rules: rules.map(refId) }),
    ...(components && { components: components.map(refId) }),
    ...(checklist && {
      checklist: checklist.map(({ rule, ...item }) =>
        rule === undefined ? item : { ...item, rule: refId(rule) },
      ),
    }),
    ...(detailsHtml && { detailsHtml }),
  };
}

/** Правила узла: из `rules` и из пунктов чек-листа, без дублей, в порядке появления. */
export function nodeRuleIds(node: ViewNode): string[] {
  const ids = [
    ...(node.rules ?? []),
    ...(node.checklist ?? []).flatMap((i) => (i.rule ? [i.rule] : [])),
  ];
  return [...new Set(ids)];
}

type RuleSource = {
  id: string;
  data: { title: string; page: Pages; summary: string; important: boolean };
  rendered?: { html: string } | undefined;
};
type ComponentSource = { id: string; data: { name: string; icon: string; howToTell: string } };
type LocationActionSource = { id: string; data: { steps: readonly string[] } };

/** Добавить готовую разметку иконки, если она указана. */
function withIconSvg<T extends WithIcon>(item: T, iconSvg: (name: string) => string): T {
  return item.icon === undefined ? item : { ...item, iconSvg: iconSvg(item.icon) };
}

/**
 * Собрать данные острова: оставить только правила и компоненты, на которые ссылаются узлы.
 * Неизвестный id — ошибка сборки (контент валидируется раньше, но страница не должна молча
 * показывать пустую карточку).
 */
export function buildWizardData(
  base: Omit<WizardData, 'rules' | 'components'>,
  ruleEntries: readonly RuleSource[],
  componentEntries: readonly ComponentSource[],
  /** Inline-SVG иконки по имени (`components/token-gold`, `renderIcon`): реестр не попадает в JS острова. */
  iconSvg: (name: string) => string,
  locationActionEntries: readonly LocationActionSource[] = [],
): WizardData {
  const allRules = new Map(ruleEntries.map((e) => [e.id, e]));
  const allComponents = new Map(componentEntries.map((e) => [e.id, e]));
  const allActions = new Map(locationActionEntries.map((e) => [e.id, e]));

  const nodes = base.nodes.map((node): ViewNode => {
    let checklist = node.checklist;
    if (node.locationAction !== undefined) {
      const action = allActions.get(node.locationAction);
      if (!action)
        throw new Error(
          `wizard: узел ${node.id} ссылается на неизвестное действие локации ${node.locationAction}`,
        );
      checklist = [...action.data.steps.map((text) => ({ text })), ...(checklist ?? [])];
    }
    return {
      ...node,
      ...(checklist && { checklist: checklist.map((i) => withIconSvg(i, iconSvg)) }),
      ...(node.options && { options: node.options.map((o) => withIconSvg(o, iconSvg)) }),
    };
  });

  const rules: Record<string, RuleView> = {};
  const components: Record<string, ComponentView> = {};
  for (const node of base.nodes) {
    for (const id of nodeRuleIds(node)) {
      const entry = allRules.get(id);
      if (!entry) throw new Error(`wizard: узел ${node.id} ссылается на неизвестное правило ${id}`);
      const { title, page, summary, important } = entry.data;
      rules[id] = { id, title, page, summary, important, html: entry.rendered?.html ?? '' };
    }
    for (const id of node.components ?? []) {
      const entry = allComponents.get(id);
      if (!entry)
        throw new Error(`wizard: узел ${node.id} ссылается на неизвестный компонент ${id}`);
      const { name, icon, howToTell } = entry.data;
      components[id] = {
        id,
        name,
        iconSvg: iconSvg(`components/${icon.replace(/\.svg$/, '')}`),
        howToTell,
      };
    }
  }
  return { ...base, nodes, rules, components };
}

type SchoolSource = { id: string; data: Omit<SchoolView, 'id'> };

/** Записи коллекции `schools` → словарь для острова. Неизвестный id файла — ошибка сборки. */
export function toSchoolViews(
  entries: readonly SchoolSource[],
): Partial<Record<School, SchoolView>> {
  const views: Partial<Record<School, SchoolView>> = {};
  for (const { id, data } of entries) {
    if (!isSchool(id)) throw new Error(`wizard: неизвестная школа ${id}`);
    const { name, specialization, timing, effect, page, color } = data;
    views[id] = { id, name, specialization, timing, effect, page, color };
  }
  return views;
}

type ReminderSource = {
  id: string;
  data: { text: string; order: number; page: Pages; phases: readonly Phase[]; rule: Ref };
};

/** Записи коллекции `reminders` → пункты панели по `order`. Неизвестное правило — ошибка сборки. */
export function toReminderViews(
  entries: readonly ReminderSource[],
  ruleEntries: readonly RuleSource[],
): ReminderView[] {
  const titles = new Map(ruleEntries.map((e) => [e.id, e.data.title]));
  return entries
    .toSorted((a, b) => a.data.order - b.data.order)
    .map(({ id, data }) => {
      const ruleId = refId(data.rule);
      const title = titles.get(ruleId);
      if (title === undefined)
        throw new Error(`wizard: напоминание ${id} ссылается на неизвестное правило ${ruleId}`);
      return {
        id,
        text: data.text,
        page: data.page,
        phases: data.phases,
        rule: { id: ruleId, title },
      };
    });
}
