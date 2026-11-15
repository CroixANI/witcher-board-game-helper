// Узел `choice`: 2+ крупные кнопки; варианты с showIf=false скрыты (SPEC 6.2).
import { OptionButtons, type StepProps } from './shared';

export function ChoiceStep(props: StepProps) {
  return <OptionButtons {...props} />;
}
