// Схема игрового поля с подсветкой зон (SPEC 11.3, ROADMAP R1.3).
// Подложка — собственный SVG `board-schematic.svg`; поверх неё по координатам из board-zones.ts
// рисуются рамки подсвеченных зон и бейджи с подписями (обычно номера шагов подготовки).
import schematic from '../assets/svg/board/board-schematic.svg?raw';
import { BOARD_VIEWBOX, BOARD_ZONES, type BoardZone } from '../data/board-zones';
import { withA11y } from '../lib/icons';
import './BoardSchematic.css';

const zonesById = new Map(BOARD_ZONES.map((zone) => [zone.id, zone]));

// Подложка декоративна (смысл передаёт подпись схемы), а id зон превращаются в data-zone,
// чтобы две схемы на одной странице не давали дублей id.
const BASE = withA11y(schematic, { decorative: true }).replaceAll(' id="z-', ' data-zone="z-');

// Бейдж сидит на верхней границе зоны, чтобы не закрывать её содержимое (например, «у колоды +1»).
const BADGE = { height: 6, fontSize: 4.4, charWidth: 2.5, padding: 1.6, inset: 1 } as const;

function zone(id: string): BoardZone {
  const found = zonesById.get(id);
  if (found === undefined) throw new Error(`BoardSchematic: нет зоны «${id}» в board-zones.ts`);
  return found;
}

interface Props {
  /** id зон для подсветки, в порядке подписи. */
  zones: readonly string[];
  /** Подписи зон на схеме (обычно номера шагов), ключ — id зоны. */
  labels?: Readonly<Record<string, string>>;
  class?: string;
}

export function BoardSchematic({ zones, labels = {}, class: className }: Props) {
  const active = zones.map(zone);
  for (const id of Object.keys(labels)) zone(id);

  const title =
    active.length === 0
      ? 'Схема игрового поля'
      : `Схема игрового поля. Подсвечено: ${active.map((z) => z.label).join('; ')}`;

  return (
    <figure class={className === undefined ? 'board-schematic' : `board-schematic ${className}`}>
      <svg
        viewBox={`0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}`}
        role="img"
        aria-label={title}
      >
        <g dangerouslySetInnerHTML={{ __html: BASE }} />
        {active.map((z) => {
          const label = labels[z.id];
          const badgeWidth =
            label === undefined ? 0 : label.length * BADGE.charWidth + 2 * BADGE.padding;
          const badgeX = z.x + BADGE.inset;
          const badgeY = Math.max(z.y - BADGE.height / 2, 0);
          return (
            <g key={z.id} class="board-schematic__zone" data-highlight={z.id}>
              <rect x={z.x + 0.5} y={z.y + 0.5} width={z.w - 1} height={z.h - 1} rx="1.5" />
              {label !== undefined && (
                <g class="board-schematic__badge">
                  <rect
                    x={badgeX}
                    y={badgeY}
                    width={badgeWidth}
                    height={BADGE.height}
                    rx={BADGE.height / 2}
                  />
                  <text
                    x={badgeX + badgeWidth / 2}
                    y={badgeY + BADGE.height / 2}
                    font-size={BADGE.fontSize}
                  >
                    {label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {active.length > 0 && (
        <figcaption>
          <ul class="board-schematic__legend">
            {active.map((z) => (
              <li key={z.id}>
                {labels[z.id] !== undefined && (
                  <span class="board-schematic__legend-badge">{labels[z.id]}</span>
                )}
                <span>
                  {z.label}
                  {z.note !== undefined && <small> {z.note}</small>}
                </span>
              </li>
            ))}
          </ul>
        </figcaption>
      )}
    </figure>
  );
}
