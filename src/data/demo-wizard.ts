/**
 * Демо-граф для служебной страницы /dev/wizard/ и тестов острова (ROADMAP R2.2).
 * Покрывает все 6 типов узлов, параметр players, флаг, счётчик и цикл. Это не контент игры:
 * тексты — упрощённые формулировки для проверки UI.
 *
 * d-players (choice) → d-table (step) → d-fight (question) ─да→ d-battle (loop) ─┐
 *                                                        └нет→ d-summary (info) ←┘ → d-end (end)
 */
import type { ViewNode, WizardData } from '../lib/wizard-view';

const nodes: ViewNode[] = [
  {
    id: 'd-players',
    type: 'choice',
    title: 'Сколько игроков?',
    phase: 'setup',
    pages: 6,
    showIf: { missingParam: 'players' },
    options: [
      { label: '2 игрока', next: 'd-table', setParam: { key: 'players', value: 2 } },
      { label: '3 игрока', next: 'd-table', setParam: { key: 'players', value: 3 } },
      { label: '4 игрока', next: 'd-table', setParam: { key: 'players', value: 4 } },
      {
        label: '5 игроков',
        hint: 'Добавляется доп. стопка монстров',
        next: 'd-table',
        setParam: { key: 'players', value: 5 },
      },
    ],
  },
  {
    id: 'd-table',
    type: 'step',
    title: 'Ряд карт действий',
    phase: 'setup',
    pages: [6, 19],
    note: 'Демо-шаг: чек-лист, схема поля, компонент, правило.',
    rules: ['setup-action-row'],
    components: ['action-card'],
    zones: ['z-action-row', 'z-action-deck'],
    warning: 'Карты стоимостью 0 кладутся в правые ячейки ряда.',
    checklist: [
      { text: 'Положите колоду карт действий на поле' },
      { text: 'Разложите ряд из 6 карт' },
      { text: 'Только при 4–5 игроках: доп. пункт', showIf: { players: [4, 5] } },
      { text: 'В руке не больше 7 карт', rule: 'hand-limit' },
    ],
    next: 'd-fight',
  },
  {
    id: 'd-fight',
    type: 'question',
    title: 'Будет битва?',
    phase: 'phase2',
    pages: 15,
    question: 'Вы выбрали битву в фазе II?',
    yes: { label: 'Да', next: 'd-battle', set: { fought: true } },
    no: { label: 'Нет', next: 'd-summary' },
  },
  {
    id: 'd-battle',
    type: 'loop',
    title: 'Битва',
    phase: 'battle',
    pages: [22, 23, 24],
    counterKey: 'battleTurn',
    actorLabel: 'Ходит: вы',
    checklist: [{ text: 'Сыграйте комбинацию' }, { text: 'Доберите карты' }],
    options: [
      { label: 'Следующий ход', next: 'd-battle', increment: true },
      { label: 'Битва окончена', next: 'd-summary' },
    ],
  },
  {
    id: 'd-summary',
    type: 'info',
    title: 'Итоги',
    phase: 'phase3',
    pages: 18,
    body: 'Демо-узел info: текст без чек-листа.\n\nВторой абзац.',
    next: 'd-end',
  },
  {
    id: 'd-end',
    type: 'end',
    title: 'Ход завершён',
    phase: 'phase3',
    pages: 12,
    outcome: 'turn-complete',
    resetTo: 'd-fight',
  },
];

export const DEMO_WIZARD: Omit<WizardData, 'rules' | 'components'> = {
  graph: 'turn',
  title: 'Демо',
  entry: 'd-players',
  nodes,
};
