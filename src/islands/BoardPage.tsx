// Страница поля `/board/` (SPEC 11.5.3). Схема и карточки зон отрисованы при сборке и приходят
// слотом; без JS подсветку даёт `:target`. Остров добавляет тап по карточке: подсветка зоны
// и `location.hash` через `replaceState` (без лишних записей в истории), `hashchange` — синхронизация.
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

interface Props {
  zoneIds: readonly string[];
  children?: ComponentChildren;
}

export function BoardPage({ zoneIds, children }: Props) {
  const [current, setCurrent] = useState<string | undefined>();

  useEffect(() => {
    const ids = new Set(zoneIds);
    const sync = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      setCurrent(ids.has(id) ? id : undefined);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [zoneIds]);

  const onClick = (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const card = e.target.closest<HTMLElement>('.zone-card');
    if (card === null) return;
    // Ссылки внутри карточки (компоненты, правила) работают как обычно; кроме якоря заголовка.
    const link = e.target.closest('a');
    if (link !== null && !link.classList.contains('zone-card__anchor')) return;
    e.preventDefault();
    history.replaceState(history.state, '', `#${card.id}`);
    setCurrent(card.id);
  };

  return (
    <div class="board-page" data-current={current} onClick={onClick}>
      {children}
    </div>
  );
}
