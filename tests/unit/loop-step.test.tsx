// @vitest-environment happy-dom
// LoopStep (ROADMAP R4.1): счётчик хода битвы, «Ходит: …» и подсказка «Тип атаки выбирает …».
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/preact';
import { LoopStep } from '../../src/islands/steps/LoopStep';
import type { StepActions } from '../../src/islands/steps/shared';
import type { PlayerCount, WizardState } from '../../src/lib/wizard-engine';
import type { ViewNode } from '../../src/lib/wizard-view';

afterEach(cleanup);

const noop = () => undefined;
const act: StepActions = {
  advance: noop,
  choose: noop,
  toggle: noop,
  resetTurn: noop,
  restartAll: noop,
};

const loop = (monsterAttack?: boolean): ViewNode => ({
  id: 'bm-monster-turn',
  type: 'loop',
  title: 'Ход монстра',
  phase: 'battle',
  pages: 25,
  counterKey: 'battleTurn',
  actorLabel: 'Ходит: монстр',
  monsterAttack,
  checklist: [{ text: 'Открыть карту' }],
  options: [
    { label: 'Ход ведьмака →', next: 'bm-witcher-turn', increment: true },
    { label: 'Битва окончена', next: 'bm-outcome' },
  ],
});

const state = (
  players: PlayerCount | undefined,
  battleTurn: number,
  witcherFirst = false,
): WizardState => ({
  v: 1,
  graph: 'turn',
  params: players === undefined ? {} : { players },
  current: 'bm-monster-turn',
  history: [],
  flags: witcherFirst ? { witcherFirst: true } : {},
  counters: { battleTurn },
  checked: {},
  updatedAt: 0,
});

const hint = () => screen.queryByText(/^Тип атаки выбирает/)?.textContent;

describe('<LoopStep>', () => {
  it('ход битвы и «Ходит: монстр»', () => {
    render(<LoopStep node={loop(true)} state={state(3, 2)} act={act} />);
    expect(screen.getByText('Ход 3')).toBeTruthy();
    expect(screen.getByText('Ходит: монстр')).toBeTruthy();
  });

  it('1-й ход монстра (монстр первый) — выбирает игрок справа', () => {
    render(<LoopStep node={loop(true)} state={state(4, 0)} act={act} />);
    expect(hint()).toMatch(/игрок справа от вас/);
  });

  it('3 игрока, ведьмак первый: ход битвы 4 = 2-й ход монстра → игрок слева', () => {
    render(<LoopStep node={loop(true)} state={state(3, 3, true)} act={act} />);
    expect(screen.getByText('Ход 4')).toBeTruthy();
    expect(hint()).toMatch(/игрок слева/);
  });

  it('2 игрока: всегда соперник', () => {
    render(<LoopStep node={loop(true)} state={state(2, 4)} act={act} />);
    expect(hint()).toMatch(/соперник/);
  });

  it('без monsterAttack подсказки нет', () => {
    render(<LoopStep node={loop()} state={state(3, 0)} act={act} />);
    expect(hint()).toBeUndefined();
  });
});
