// Итог подготовки (s12): раздача по местам (SPEC 7.1, стр. 8) и порядок выбора планшетов (SPEC 7.2, стр. 7).
import { boardPickOrder, START_RESOURCES, type PlayerCount } from '../data/start-resources';

/** Подпись места: первый игрок и его сосед справа — те, от кого отсчитывают. */
function seatLabel(seat: number, players: PlayerCount): string {
  if (seat === 1) return '1-й — первый игрок';
  if (seat === players) return `${seat}-й — справа от первого`;
  return `${seat}-й`;
}

export function SetupSummary({ players }: { players: PlayerCount | undefined }) {
  if (!players) {
    return (
      <p class="wizard-banner">Число игроков не выбрано — начните подготовку заново (шаг 0).</p>
    );
  }
  return (
    <div class="setup-summary">
      <section aria-labelledby="summary-resources">
        <h3 id="summary-resources">Раздача по местам</h3>
        <p>
          Место — очерёдность хода по часовой стрелке от первого игрока. Карты берите из своей
          перемешанной колоды — это стартовая рука.
        </p>
        <table class="setup-summary__table">
          <thead>
            <tr>
              <th scope="col">Место</th>
              <th scope="col">Карты</th>
              <th scope="col">Золото</th>
            </tr>
          </thead>
          <tbody>
            {START_RESOURCES[players].map(({ cards, gold }, i) => (
              <tr key={i}>
                <th scope="row">{seatLabel(i + 1, players)}</th>
                <td>{cards}</td>
                <td>{gold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="summary-boards">
        <h3 id="summary-boards">Порядок выбора планшетов</h3>
        <p>
          Сначала выбирает игрок справа от первого, дальше — против часовой стрелки. Каждый
          перемешивает невыбранные планшеты лицом вниз, берёт 2 и оставляет себе 1.
          {players === 5 && ' Первому игроку достаётся последний оставшийся планшет.'}
        </p>
        <ol class="setup-summary__order">
          {boardPickOrder(players).map((seat) => (
            <li key={seat}>{seatLabel(seat, players)}</li>
          ))}
        </ol>
        <p class="setup-summary__hint">
          Можно и договориться между собой или раздать планшеты случайно.
        </p>
      </section>
    </div>
  );
}
