// Узел `question`: вопрос и кнопки «Да» / «Нет» (SPEC 6.2).
import { OptionButtons, type StepProps } from './shared';

export function QuestionStep(props: StepProps) {
  return (
    <>
      <p class="wizard-question">{props.node.question}</p>
      <OptionButtons {...props} inline />
    </>
  );
}
