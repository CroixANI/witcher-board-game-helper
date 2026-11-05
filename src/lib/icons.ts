// Реестр собственных SVG-иконок (SPEC 11.2). Файлы встраиваются inline как строки (`?raw`),
// поэтому иконки работают offline и без лишних запросов — и в Astro, и в Preact-островах.

const files = import.meta.glob<string>('../assets/svg/{components,actions,icons}/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Имя иконки — путь относительно `src/assets/svg/` без `.svg`, например `components/token-gold`. */
export type IconName = string;

const PREFIX = '../assets/svg/';

const registry = new Map<IconName, string>(
  Object.entries(files).map(([path, raw]) => [path.slice(PREFIX.length, -'.svg'.length), raw]),
);

/** Все доступные имена, отсортированы. */
export const iconNames: readonly IconName[] = [...registry.keys()].sort();

export interface IconOptions {
  /** Доступное имя. По умолчанию — `aria-label` из файла. */
  label?: string | undefined;
  /** Декоративная иконка (рядом есть текст): скрыть от скринридеров. */
  decorative?: boolean | undefined;
}

const OPEN_TAG = /<svg\b[^>]*>/;
const A11Y_ATTR = /\s(?:role|aria-label|aria-hidden|focusable)="[^"]*"/g;

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Подпись иконки из её файла (`aria-label` корневого `<svg>`). */
export function defaultIconLabel(svg: string): string | undefined {
  const label = OPEN_TAG.exec(svg)?.[0].match(/\saria-label="([^"]*)"/)?.[1];
  return label === undefined || label === '' ? undefined : label;
}

/** Подпись иконки по имени (для превью и подписей рядом с иконкой). */
export function iconLabel(name: IconName): string | undefined {
  const raw = registry.get(name);
  return raw === undefined ? undefined : defaultIconLabel(raw);
}

/** Заменяет a11y-атрибуты корневого `<svg>`: либо `role="img"` + подпись, либо `aria-hidden`. */
export function withA11y(svg: string, { label, decorative = false }: IconOptions = {}): string {
  const open = OPEN_TAG.exec(svg)?.[0];
  if (open === undefined) throw new Error('withA11y: в разметке нет корневого <svg>');

  const name = label ?? defaultIconLabel(svg);
  const a11y =
    decorative || name === undefined
      ? ' aria-hidden="true" focusable="false"'
      : ` role="img" aria-label="${escapeAttr(name)}"`;

  return svg.replace(open, open.replace(A11Y_ATTR, '').replace(/^<svg\b/, `<svg${a11y}`));
}

/** Готовая inline-разметка иконки. Неизвестное имя — ошибка (ломает сборку, а не тихо пропадает). */
export function renderIcon(name: IconName, options: IconOptions = {}): string {
  const raw = registry.get(name);
  if (raw === undefined) {
    throw new Error(`Icon: нет иконки «${name}» в src/assets/svg/ (доступно: ${iconNames.length})`);
  }
  return withA11y(raw, options);
}
