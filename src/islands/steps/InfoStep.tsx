// Узел `info`: текст и правило, переход по «Далее» (SPEC 6.2).
import { NextButton, type StepProps } from './shared';

export function InfoStep({ node, act }: StepProps) {
  return (
    <>
      {node.body?.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <NextButton act={act} />
    </>
  );
}
