// Компонент игры в шаге wizard'а (SPEC 4.4): иконка, название, «как отличить», ссылка в справочник.
import { url } from '../lib/url';
import type { ComponentView } from '../lib/wizard-view';

export function ComponentChip({ component }: { component: ComponentView }) {
  return (
    <li class="component-chip">
      <span
        class="icon component-chip__icon"
        dangerouslySetInnerHTML={{ __html: component.iconSvg }}
      />
      <span>
        <a href={url(`reference#${component.id}`)}>{component.name}</a>
        <span class="component-chip__hint">{component.howToTell}</span>
      </span>
    </li>
  );
}
