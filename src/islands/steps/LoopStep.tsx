// Узел `loop`: счётчик «ход N», «Ходит: …», чек-лист и варианты (SPEC 6.2, wireframe «Цикл битвы»).
import { Checklist, loopTurn, OptionButtons, type StepProps } from './shared';

export function LoopStep(props: StepProps) {
  const { node, state } = props;
  return (
    <>
      <p class="wizard-loop-meta">
        <span class="wizard-loop-meta__turn">Ход {loopTurn(node, state)}</span>
        {node.actorLabel && <span>{node.actorLabel}</span>}
      </p>
      <Checklist {...props} />
      <OptionButtons {...props} inline />
    </>
  );
}
