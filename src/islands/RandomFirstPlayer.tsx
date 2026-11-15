// Кнопка 🎲 в шаге s09: случайный первый игрок (FR-1.4, стр. 7).
// Места считаются от владельца телефона по часовой стрелке — так результат понятен за столом.
import { useState } from 'preact/hooks';
import type { PlayerCount } from '../data/start-resources';
import { randomInt } from '../lib/random';

interface Props {
  players: PlayerCount | undefined;
  /** Для тестов; по умолчанию — `randomInt` на `crypto.getRandomValues`. */
  random?: (n: number) => number;
}

export function RandomFirstPlayer({ players, random = randomInt }: Props) {
  const [seat, setSeat] = useState<number | undefined>(undefined);
  if (!players) return null;
  return (
    <div class="wizard-random">
      <button type="button" onClick={() => setSeat(random(players) + 1)}>
        🎲 {seat === undefined ? 'Выбрать случайно' : 'Бросить ещё раз'}
      </button>
      <p aria-live="polite">
        {seat === 1 && 'Первым ходите вы.'}
        {seat !== undefined &&
          seat > 1 &&
          `Считайте от себя по часовой стрелке, вы — 1-й: первым ходит ${seat}-й игрок.`}
      </p>
    </div>
  );
}
