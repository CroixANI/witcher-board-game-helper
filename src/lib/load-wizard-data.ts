/**
 * Данные острова `WizardIsland` из коллекций Astro (ROADMAP R2.2). Вызывать только на этапе сборки
 * (frontmatter страниц): Markdown правил и шагов подготовки здесь превращается в HTML.
 */
import { getCollection } from 'astro:content';
import { renderIcon } from './icons';
import type { GraphName } from './wizard-engine';
import {
  buildWizardData,
  toReminderViews,
  toSchoolViews,
  toViewNode,
  type ViewNode,
  type WizardData,
} from './wizard-view';

const TITLES: Record<GraphName, string> = { setup: 'Подготовка', turn: 'Ход' };

/** Правила и компоненты для `buildWizardData` — пригодится и для своих графов (страница /dev/). */
export async function loadWizardRefs() {
  return Promise.all([getCollection('rules'), getCollection('components')]);
}

/** Декоративная иконка по имени (`components/token-gold`): название стоит рядом текстом. */
export const iconSvg = (name: string): string => renderIcon(name, { decorative: true });

export async function loadWizardData(graph: GraphName): Promise<WizardData> {
  let entry: string;
  let nodes: ViewNode[];
  let progress: string[] | undefined;
  if (graph === 'setup') {
    const entries = (await getCollection('setup')).toSorted((a, b) => a.data.order - b.data.order);
    nodes = entries.map((e) => toViewNode(e.data.node, e.rendered?.html));
    entry = nodes[0]?.id ?? '';
    progress = nodes.map((n) => n.id);
  } else {
    const subgraphs = await getCollection('turn');
    nodes = subgraphs.flatMap((s) => s.data.nodes.map((n) => toViewNode(n)));
    entry = subgraphs.find((s) => s.data.subgraph === 'start')?.data.entry ?? '';
  }
  if (!entry) throw new Error(`wizard: у графа ${graph} нет точки входа`);
  const [rules, components] = await loadWizardRefs();
  const turn = graph === 'turn';
  const schools = turn ? toSchoolViews(await getCollection('schools')) : undefined;
  const reminders = turn ? toReminderViews(await getCollection('reminders'), rules) : undefined;
  return buildWizardData(
    { graph, title: TITLES[graph], entry, nodes, progress, schools, reminders },
    rules,
    components,
    iconSvg,
    await getCollection('locationActions'),
  );
}
