// Узел `end`: итог и кнопка нового цикла (SPEC 6.2, 6.6).
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

export function EndStep({ node, act }: StepProps) {
  const outcome = OUTCOMES[node.outcome ?? 'turn-complete'];
  // Ход повторяется с теми же параметрами партии; подготовка и победа начинают всё заново.
  const onClick = node.outcome === 'turn-complete' ? act.resetTurn : act.restartAll;
  return (
    <>
      <p class="wizard-outcome">{outcome.text}</p>
      <div class="wizard-actions">
        <button type="button" class="wizard-primary" onClick={onClick}>
          {outcome.button}
        </button>
      </div>
    </>
  );
}
