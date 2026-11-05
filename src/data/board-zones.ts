/**
 * Зоны схемы игрового поля (SPEC 11.3). Координаты — в единицах viewBox `board-schematic.svg`.
 * Раскладка повторяет «Пример подготовки вдвоём» (стр. 7) по расположению зон, а не по графике.
 */
export const BOARD_VIEWBOX = { width: 200, height: 140 } as const;

export type BoardZone = {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Шаги подготовки / фазы, где зона подсвечивается. */
  readonly steps: string;
  readonly note?: string;
};

export const BOARD_ZONES: readonly BoardZone[] = [
  { id: 'z-board', label: 'Всё поле', x: 0, y: 0, w: 160, h: 100, steps: '1' },
  {
    id: 'z-map',
    label: 'Карта Континента (локации, фигурки, монстры)',
    x: 0,
    y: 0,
    w: 92,
    h: 100,
    steps: '8.5, 10.3',
  },
  {
    id: 'z-trophy-track',
    label: 'Шкала трофеев (левый край карты)',
    x: 0,
    y: 40,
    w: 7,
    h: 58,
    steps: '10.2',
  },
  {
    id: 'z-monster-slots',
    label: '3 ячейки карт монстров и места жетонов локаций',
    x: 96,
    y: 4,
    w: 34,
    h: 46,
    steps: '7, 8.6, 11',
  },
  {
    id: 'z-action-deck',
    label: 'Колода карт действий (над рядом)',
    x: 134,
    y: 1,
    w: 22,
    h: 10,
    steps: '2',
  },
  {
    id: 'z-action-row',
    label: 'Ряд карт действий из 6 ячеек',
    x: 134,
    y: 13,
    w: 22,
    h: 85,
    steps: '2, фаза III',
    note: 'Верхние 2 ячейки — «левые» (+1 к стоимости), нижняя — «правая» (−1).',
  },
  {
    id: 'z-exploration-decks',
    label: 'Исследование города, окрестностей и события (сверху вниз)',
    x: 98,
    y: 54,
    w: 30,
    h: 44,
    steps: '5',
  },
  {
    id: 'z-skill-trophies',
    label: 'Колода трофеев за навыки (под полем)',
    x: 98,
    y: 102,
    w: 22,
    h: 14,
    steps: '4',
  },
  {
    id: 'z-elixir-deck',
    label: 'Колода эликсиров (под полем справа)',
    x: 134,
    y: 102,
    w: 22,
    h: 14,
    steps: '3',
  },
  {
    id: 'z-monster-supply',
    label: 'Карты и жетоны монстров по уровням (справа от поля)',
    x: 164,
    y: 30,
    w: 34,
    h: 50,
    steps: '8.1, 8.2',
  },
  {
    id: 'z-location-stacks',
    label: '3 стопки жетонов локаций',
    x: 164,
    y: 10,
    w: 34,
    h: 16,
    steps: '7',
  },
  {
    id: 'z-monster-battle-deck',
    label: 'Боевые карты монстров',
    x: 164,
    y: 84,
    w: 16,
    h: 14,
    steps: '8.7',
  },
  { id: 'z-supply', label: 'Золото и кубики', x: 164, y: 102, w: 34, h: 14, steps: '6' },
  {
    id: 'z-player-area',
    label: 'Зона игрока: планшет, колода слева, сброс справа',
    x: 10,
    y: 118,
    w: 140,
    h: 20,
    steps: '10.1–10.8',
  },
];

export const ZONE_IDS: ReadonlySet<string> = new Set(BOARD_ZONES.map((z) => z.id));
