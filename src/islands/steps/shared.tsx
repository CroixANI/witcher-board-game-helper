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
            <span>{item.text}</span>
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
          class="wizard-option"
          onClick={() => act.choose(i)}
        >
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
