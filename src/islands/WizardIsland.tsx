// Остров wizard'а (SPEC 4.4, 6; ROADMAP R2.2): рендерит любой граф из `WizardData`.
// Логика переходов — в wizard-engine.ts; здесь только отрисовка, история, сохранение и фокус.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import { formatPages } from '../lib/reference';
import { createSafeStorage, type SafeStorage } from '../lib/safe-storage';
import {
  advance,
  back,
  buildGraph,
  choose,
  initState,
  loadState,
  resetTurn,
  restartAll,
  saveState,
  toggleChecked,
  type Graph,
  type WizardState,
} from '../lib/wizard-engine';
import { nodeRuleIds, type Phase, type ViewNode, type WizardData } from '../lib/wizard-view';
import { ComponentChip } from './ComponentChip';
import { RuleCard } from './RuleCard';
import { ChecklistStep } from './steps/ChecklistStep';
import { ChoiceStep } from './steps/ChoiceStep';
import { EndStep } from './steps/EndStep';
import { InfoStep } from './steps/InfoStep';
import { LoopStep } from './steps/LoopStep';
import { QuestionStep } from './steps/QuestionStep';
import type { StepActions, StepProps } from './steps/shared';
import './WizardIsland.css';

const STEPS: Record<ViewNode['type'], ComponentType<StepProps>> = {
  step: ChecklistStep,
  info: InfoStep,
  choice: ChoiceStep,
  question: QuestionStep,
  loop: LoopStep,
  end: EndStep,
};

const PHASE_LABELS: Record<Phase, string> = {
  setup: 'Подготовка',
  phase1: 'Фаза I',
  phase2: 'Фаза II',
  battle: 'Битва',
  phase3: 'Фаза III',
  general: 'Ход',
};

interface Props {
  data: WizardData;
  /** Для тестов; по умолчанию — `localStorage` через safeStorage. */
  storage?: SafeStorage;
}

export function WizardIsland({ data, storage: injected }: Props) {
  const graph = useMemo(
    () => buildGraph(data.nodes, data.entry) as Graph<ViewNode>,
    [data.nodes, data.entry],
  );
  // На сервере и при гидрации — начало графа; сохранённый state читается после монтирования,
  // иначе разметка SSR и клиента разойдётся.
  const [state, setState] = useState<WizardState>(() => initState(graph, data.graph));
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const storage = useRef<SafeStorage | undefined>(injected);
  const heading = useRef<HTMLHeadingElement>(null);
  /** Узел, который пользователь уже видел: смена узла после него — переход, а не загрузка. */
  const shownNode = useRef<string | undefined>(undefined);

  useEffect(() => {
    const s = (storage.current ??= createSafeStorage());
    setState(loadState(graph, data.graph, s));
    setPersistent(s.persistent);
    setReady(true);
  }, [graph, data.graph]);

  // До загрузки не пишем: иначе начальный state затёр бы сохранённый.
  useEffect(() => {
    const s = storage.current;
    if (!ready || !s) return;
    saveState(s, state);
    setPersistent(s.persistent);
  }, [state, ready]);

  // Переход на новый узел: фокус на заголовок (SPEC 6.7). Восстановление после загрузки — без фокуса.
  useEffect(() => {
    if (!ready) return;
    if (shownNode.current !== undefined && shownNode.current !== state.current) {
      heading.current?.focus();
    }
    shownNode.current = state.current;
  }, [state.current, ready]);

  const node = graph.nodes.get(state.current)!;
  const update = (fn: (g: Graph, s: WizardState) => WizardState) => {
    setConfirming(false);
    setState((s) => fn(graph, s));
  };
  const act: StepActions = {
    advance: () => update(advance),
    choose: (i) => update((g, s) => choose(g, s, i)),
    toggle: (i) => setState((s) => toggleChecked(s, s.current, i)),
    resetTurn: () => update(resetTurn),
    restartAll: () => update(restartAll),
  };
  const restart = () => update(data.graph === 'setup' ? restartAll : resetTurn);

  const position = data.progress ? data.progress.indexOf(node.id) + 1 : 0;
  const total = data.progress?.length ?? 0;
  const barTitle = data.graph === 'setup' ? data.title : PHASE_LABELS[node.phase];
  const rules = nodeRuleIds(node).flatMap((id) => data.rules[id] ?? []);
  const components = (node.components ?? []).flatMap((id) => data.components[id] ?? []);
  const Step = STEPS[node.type];

  return (
    <section class="wizard" aria-label={data.title}>
      <div class="wizard-bar">
        <button
          type="button"
          class="wizard-bar__button"
          onClick={() => update(back)}
          disabled={state.history.length === 0}
        >
          ← Назад
        </button>
        <span class="wizard-bar__title">
          {barTitle}
          {position > 0 && ` ${position}/${total}`}
        </span>
        <button
          type="button"
          class="wizard-bar__button"
          onClick={() => setConfirming(true)}
          aria-expanded={confirming}
        >
          ⟲ <span class="visually-hidden">Начать </span>Заново
        </button>
      </div>

      {confirming && (
        <div class="wizard-confirm" role="alertdialog" aria-label="Начать заново?">
          <p>
            {data.graph === 'setup'
              ? 'Начать подготовку заново? Отметки и выбор числа игроков сбросятся.'
              : 'Начать ход заново? Школа и число игроков сохранятся.'}
          </p>
          <div class="wizard-confirm__actions">
            <button type="button" class="wizard-primary" onClick={restart}>
              Да, заново
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {!persistent && (
        <p class="wizard-banner" role="status">
          Прогресс не сохранится: хранилище браузера недоступно.
        </p>
      )}

      {total > 0 && (
        <progress class="wizard-progress" max={total} value={position} aria-label="Прогресс" />
      )}

      <p class="visually-hidden" aria-live="polite">
        {shownNode.current === undefined ? '' : `Шаг: ${node.title}`}
      </p>

      <article class="wizard-node" key={node.id}>
        <header class="wizard-node__header">
          <h2 ref={heading} tabIndex={-1}>
            {node.title}
          </h2>
          <span class="wizard-node__pages">{formatPages(node.pages)}</span>
        </header>
        {node.note && <p class="wizard-node__note">{node.note}</p>}

        <Step node={node} state={state} act={act} />

        {components.length > 0 && (
          <section class="wizard-components" aria-label="Компоненты">
            <ul>
              {components.map((c) => (
                <ComponentChip key={c.id} component={c} />
              ))}
            </ul>
          </section>
        )}
        {node.warning && (
          <p class="wizard-warning">
            <strong>⚠ Не перепутать:</strong> {node.warning}
          </p>
        )}
        {node.detailsHtml && (
          <details class="wizard-details">
            <summary>Подробнее</summary>
            <div dangerouslySetInnerHTML={{ __html: node.detailsHtml }} />
          </details>
        )}
        {rules.length > 0 && (
          <div class="wizard-rules">
            {rules.map((r) => (
              <RuleCard key={r.id} rule={r} />
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
