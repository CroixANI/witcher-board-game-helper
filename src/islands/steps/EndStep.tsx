// Узел `end`: итог и кнопка нового цикла (SPEC 6.2, 6.6).
// Итог подготовки дополнительно показывает раздачу по местам и ведёт к ходу (R2.4).
import { url } from '../../lib/url';
import { SetupSummary } from '../SetupSummary';
import type { StepProps } from './shared';

const OUTCOMES = {
  'setup-complete': {
    text: 'Поле готово — можно начинать партию.',
    button: 'Начать подготовку заново',
  },
  'turn-complete': {
    text: 'Передайте ход следующему игроку по часовой стрелке.',
    button: 'Мой следующий ход',
  },
  'game-won': { text: 'Партия окончена. Поздравляем с победой!', button: 'Новая партия' },
} as const;

export function EndStep({ node, state, act }: StepProps) {
  const outcome = OUTCOMES[node.outcome ?? 'turn-complete'];
  const setupDone = node.outcome === 'setup-complete';
  // Ход повторяется с теми же параметрами партии; подготовка и победа начинают всё заново.
  const onClick = node.outcome === 'turn-complete' ? act.resetTurn : act.restartAll;
  return (
    <>
      <p class="wizard-outcome">{outcome.text}</p>
      {setupDone && <SetupSummary players={state.params.players} />}
      <div class="wizard-actions">
        {/* Число игроков уже лежит в общем ключе twow:v1:params (saveState), ход его подхватит. */}
        {setupDone && (
          <a class="wizard-primary wizard-link-button" href={url('turn')}>
            Перейти к ходу →
          </a>
        )}
        <button type="button" class={setupDone ? undefined : 'wizard-primary'} onClick={onClick}>
          {outcome.button}
        </button>
      </div>
    </>
  );
}
