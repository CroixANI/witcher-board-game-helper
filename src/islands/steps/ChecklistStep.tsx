// Узел `step`: чек-лист (галочки не блокируют «Далее»), зоны на схеме поля (SPEC 6.2).
import { BoardSchematic } from '../BoardSchematic';
import { RandomFirstPlayer } from '../RandomFirstPlayer';
import { Checklist, NextButton, type StepProps } from './shared';

export function ChecklistStep(props: StepProps) {
  const zones = props.node.zones ?? [];
  return (
    <>
      {zones.length > 0 && <BoardSchematic zones={zones} class="wizard-board" />}
      <Checklist {...props} />
      {props.node.widget === 'random-first-player' && (
        <RandomFirstPlayer players={props.state.params.players} />
      )}
      <NextButton act={props.act} />
    </>
  );
}
