/**
 * Данные для острова `WizardIsland` (ROADMAP R2.2): граф и всё, что нужно для отрисовки узлов,
 * в сериализуемом виде. Страница собирает их на этапе сборки (Markdown правил уже в HTML)
 * и передаёт острову пропсом — в браузере коллекции Astro недоступны.
 */
import type { Condition, GraphName, Option, WizardNode } from './wizard-engine';

export type Pages = number | readonly number[];
export type Phase = 'setup' | 'phase1' | 'phase2' | 'battle' | 'phase3' | 'general';

export type ViewChecklistItem = {
  readonly text: string;
  readonly showIf?: Condition | undefined;
  readonly rule?: string | undefined;
};
export type ViewOption = Option & { readonly hint?: string | undefined };

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
  /** Текст `info`-узла. */
  readonly body?: string | undefined;
  /** Подробный текст узла в HTML (тело Markdown-файла подготовки). */
  readonly detailsHtml?: string | undefined;
  readonly question?: string | undefined;
  readonly actorLabel?: string | undefined;
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

/**
 * Собрать данные острова: оставить только правила и компоненты, на которые ссылаются узлы.
 * Неизвестный id — ошибка сборки (контент валидируется раньше, но страница не должна молча
 * показывать пустую карточку).
 */
export function buildWizardData(
  base: Omit<WizardData, 'rules' | 'components'>,
  ruleEntries: readonly RuleSource[],
  componentEntries: readonly ComponentSource[],
  /** Inline-SVG иконки по имени файла (`renderIcon`): реестр иконок не попадает в JS острова. */
  iconSvg: (file: string) => string,
): WizardData {
  const allRules = new Map(ruleEntries.map((e) => [e.id, e]));
  const allComponents = new Map(componentEntries.map((e) => [e.id, e]));

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
      components[id] = { id, name, iconSvg: iconSvg(icon), howToTell };
    }
  }
  return { ...base, rules, components };
}
