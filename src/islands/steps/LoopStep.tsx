// Узел `loop`: счётчик «ход N», «Ходит: …», чек-лист и варианты (SPEC 6.2, wireframe «Цикл битвы»).
import { Checklist, OptionButtons, type StepProps } from './shared';

export function LoopStep(props: StepProps) {
  const { node, state } = props;
  const turn = (node.counterKey ? (state.counters[node.counterKey] ?? 0) : 0) + 1;
  return (
    <>
      <p class="wizard-loop-meta">
        <span class="wizard-loop-meta__turn">Ход {turn}</span>
        {node.actorLabel && <span>{node.actorLabel}</span>}
      </p>
      <Checklist {...props} />
      <OptionButtons {...props} inline />
    </>
  );
}
