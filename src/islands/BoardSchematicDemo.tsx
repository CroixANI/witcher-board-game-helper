// Переключатель зон для служебной страницы /dev/board/ (ROADMAP R1.3): любую зону можно подсветить,
// подписи — номера шагов из board-zones.ts.
import { useState } from 'preact/hooks';
import { BOARD_ZONES } from '../data/board-zones';
import { BoardSchematic } from './BoardSchematic';

const STEP_LABELS = Object.fromEntries(BOARD_ZONES.map((z) => [z.id, z.steps]));

export function BoardSchematicDemo({ initial = ['z-action-row'] }: { initial?: string[] }) {
  const [zones, setZones] = useState<string[]>(initial);
  const [withLabels, setWithLabels] = useState(true);

  const toggle = (id: string) =>
    setZones((current) =>
      current.includes(id) ? current.filter((z) => z !== id) : [...current, id],
    );

  const labels = withLabels
    ? Object.fromEntries(zones.map((id) => [id, STEP_LABELS[id] ?? '']))
    : undefined;

  return (
    <div class="board-demo">
      <BoardSchematic zones={zones} {...(labels === undefined ? {} : { labels })} />
      <fieldset>
        <legend>Подсветить зоны</legend>
        <label>
          <input type="checkbox" checked={withLabels} onChange={() => setWithLabels(!withLabels)} />{' '}
          Подписывать номерами шагов
        </label>
        <div class="board-demo__actions">
          <button type="button" onClick={() => setZones(BOARD_ZONES.map((z) => z.id))}>
            Все
          </button>
          <button type="button" onClick={() => setZones([])}>
            Сбросить
          </button>
        </div>
        {BOARD_ZONES.map((z) => (
          <label key={z.id}>
            <input type="checkbox" checked={zones.includes(z.id)} onChange={() => toggle(z.id)} />
            <span>
              {z.label}
              <code>{z.id}</code>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
