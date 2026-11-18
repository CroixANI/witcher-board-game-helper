// Узел `loop`: счётчик «ход N», «Ходит: …», чек-лист и варианты (SPEC 6.2, wireframe «Цикл битвы»).
import { attackChooser, monsterTurnNumber } from '../../lib/monster-battle';
import { Checklist, loopTurn, OptionButtons, type StepProps } from './shared';

export function LoopStep(props: StepProps) {
  const { node, state } = props;
  const turn = loopTurn(node, state);
  return (
    <>
      <p class="wizard-loop-meta">
        <span class="wizard-loop-meta__turn">Ход {turn}</span>
        {node.actorLabel && <span>{node.actorLabel}</span>}
      </p>
      {node.monsterAttack && (
        <p class="wizard-loop-hint">
          {attackChooser(
            state.params.players,
            monsterTurnNumber(turn, state.flags['witcherFirst'] === true),
          )}
        </p>
      )}
      <Checklist {...props} />
      <OptionButtons {...props} inline />
    </>
  );
}
