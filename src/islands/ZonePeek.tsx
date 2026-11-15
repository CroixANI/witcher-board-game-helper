// Панель зоны на страницах чтения (SPEC 11.5.4): клик по `a.zone-link` не уводит со страницы,
// а открывает нижнюю панель со схемой и описанием зоны. Без JS ссылка ведёт на `/board/#<id>`.
import { useEffect, useRef, useState } from 'preact/hooks';
import { url } from '../lib/url';
import { BoardSchematic } from './BoardSchematic';
import { BottomSheet } from './BottomSheet';
import './ZonePeek.css';

export type ZoneText = { readonly title: string; readonly summary: string };

const TITLE_ID = 'zone-sheet-title';

/** Обычный клик основной кнопкой: с модификаторами пусть браузер откроет ссылку как обычно. */
const plainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export function ZonePeek({ zones }: { zones: Readonly<Record<string, ZoneText>> }) {
  const [current, setCurrent] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || !plainClick(e) || !(e.target instanceof Element)) return;
      const link = e.target.closest<HTMLElement>('a.zone-link');
      const id = link?.dataset['zone'];
      if (link == null || id === undefined || !(id in zones)) return;
      e.preventDefault();
      trigger.current = link;
      setCurrent(id);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [zones]);

  const close = () => {
    setCurrent(null);
    trigger.current?.focus();
    trigger.current = null;
  };

  const zone = current === null ? undefined : zones[current];
  return (
    <BottomSheet open={zone !== undefined} onClose={close} labelledBy={TITLE_ID} class="zone-sheet">
      {current !== null && zone !== undefined && (
        <>
          <h2 id={TITLE_ID}>{zone.title}</h2>
          <BoardSchematic zones={[current]} legend={false} class="zone-sheet__board" />
          <p>{zone.summary}</p>
          <a class="zone-sheet__more" href={url(`board/#${current}`)}>
            Подробнее о поле →
          </a>
        </>
      )}
    </BottomSheet>
  );
}
