// Бейдж школы в wizard'е хода (SPEC 4.4, 9.3; ROADMAP R3.1): свёрнут до названия специализации,
// раскрывается условием и эффектом. Значения эффекта зависят от уровня — напоминаем, что действует
// только текущий уровень (стр. 34–35).
import { formatPages } from '../lib/reference';
import type { SchoolView } from '../lib/wizard-view';

export function SchoolBadge({ school }: { school: SchoolView }) {
  return (
    <details class="school-badge" style={{ '--school-color': school.color }}>
      <summary>
        <span class="school-badge__dot" aria-hidden="true" />
        <span class="school-badge__name">{school.name}</span>
        <span class="school-badge__spec">{school.specialization}</span>
      </summary>
      <div class="school-badge__body">
        <p>
          <strong>Когда:</strong> {school.timing}
        </p>
        <p>
          <strong>Эффект:</strong> {school.effect}
        </p>
        <p class="school-badge__level">
          Применяйте только эффект <strong>текущего</strong> уровня специализации, не прошлых.
        </p>
        <p class="school-badge__pages">{formatPages(school.page)}</p>
      </div>
    </details>
  );
}
