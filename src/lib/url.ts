const SUFFIX = /[?#].*$/;

/**
 * Склеивает base path и внутренний путь сайта.
 * Страницам добавляется завершающий `/` (trailingSlash: 'always'),
 * файлам (последний сегмент с точкой), query и hash — нет.
 */
export function joinBase(base: string, path = ''): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  const suffix = SUFFIX.exec(path)?.[0] ?? '';
  let pathname = path.slice(0, path.length - suffix.length).replace(/^\/+/, '');
  const last = pathname.split('/').pop() ?? '';
  if (pathname && !pathname.endsWith('/') && !last.includes('.')) pathname += '/';
  return root + pathname + suffix;
}

/** Внутренняя ссылка с учётом `base` из astro.config.mjs. */
export function url(path = ''): string {
  return joinBase(import.meta.env.BASE_URL, path);
}
