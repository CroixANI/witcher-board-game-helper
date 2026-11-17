// Общие части шагов wizard'а: пропсы, чек-лист, кнопки вариантов, «Далее».
import { evaluate, visibleOptions, type WizardState } from '../../lib/wizard-engine';
import type { ViewNode, ViewOption } from '../../lib/wizard-view';

export type StepActions = {
  advance(): void;
  /** Индекс — среди видимых вариантов (`visibleOptions`). */
  choose(index: number): void;
  toggle(index: number): void;
  resetTurn(): void;
  restartAll(): void;
};

export type StepProps = { node: ViewNode; state: WizardState; act: StepActions };

/** Номер итерации `loop`-узла («Ход N»), с 1; для других узлов — 0. */
export function loopTurn(node: ViewNode, state: WizardState): number {
  if (node.type !== 'loop' || !node.counterKey) return 0;
  return (state.counters[node.counterKey] ?? 0) + 1;
}

/** Декоративная иконка варианта или пункта: подпись — текст рядом (SPEC 6.7). */
function ItemIcon({ svg }: { svg: string | undefined }) {
  if (svg === undefined) return null;
  return (
    <span class="icon wizard-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

/** Нативные чекбоксы (SPEC 6.7); скрытые по `showIf` пункты не показываются, индексы — исходные. */
export function Checklist({ node, state, act }: StepProps) {
  const marks = state.checked[node.id] ?? [];
  const items = (node.checklist ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => evaluate(item.showIf, state));
  return (
    <ul class="wizard-checklist">
      {items.map(({ item, index }) => (
        <li key={index}>
          <label>
            <input
              type="checkbox"
              checked={marks.includes(index)}
              onChange={() => act.toggle(index)}
            />
            <ItemIcon svg={item.iconSvg} />
            <span class="wizard-checklist__text">{item.text}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Крупные кнопки-карточки вариантов (`choice`, `question`, `loop`). */
export function OptionButtons({
  node,
  state,
  act,
  inline = false,
}: StepProps & { inline?: boolean }) {
  const options = visibleOptions(node, state) as ViewOption[];
  return (
    <div class={inline ? 'wizard-options wizard-options--inline' : 'wizard-options'}>
      {options.map((option, i) => (
        <button
          key={option.next + i}
          type="button"
          class={option.iconSvg ? 'wizard-option wizard-option--icon' : 'wizard-option'}
          onClick={() => act.choose(i)}
        >
          <ItemIcon svg={option.iconSvg} />
          <span class="wizard-option__label">{option.label}</span>
          {option.hint && <span class="wizard-option__hint">{option.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function NextButton({ act }: { act: StepActions }) {
  return (
    <div class="wizard-actions">
      <button type="button" class="wizard-primary" onClick={act.advance}>
        Далее →
      </button>
    </div>
  );
}
