/**
 * Ссылки на зоны поля из Markdown (SPEC 11.5.2): `[текст](zone:<id>)`.
 *
 * - `zoneLinksPlugin` — mdast-плагин Sätteri (процессор Markdown в Astro 7), подключён в
 *   `astro.config.mjs`. Переписывает ссылку на `<base>/board/#<id>`, добавляет
 *   `class="zone-link"` и `data-zone`. Неизвестный id — исключение, сборка падает.
 * - `findZoneLinks` — то же без Astro, для `validate-content` (инвариант 7г).
 */
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MdastPluginDefinition } from 'satteri';
import { ZONE_IDS } from '../data/board-zones';
import { joinBase } from './url';

const PREFIX = 'zone:';

/** `](zone:<id>` или `](<zone:<id>>` — id до пробела (title ссылки), `)` или `>`. */
const ZONE_LINK = /\]\(<?zone:([^\s)>]*)/g;

/** Определение ссылки `[r]: zone:…` (reference-стиль). */
const ZONE_REFERENCE = /^ {0,3}\[[^\]]+\]:\s*<?zone:/m;

/** Ссылки `zone:` только inline: к reference-ссылке плагин не может добавить class и data-zone. */
export const ZONE_REFERENCE_ERROR =
  'ссылка zone: в reference-стиле не поддерживается, пишите [текст](zone:<id>)';

/** Есть ли в тексте определение ссылки `[r]: zone:…`. */
export function hasZoneReference(markdown: string): boolean {
  return ZONE_REFERENCE.test(markdown);
}

/** id из всех inline-ссылок `zone:` в тексте Markdown, по порядку, с повторами. */
export function findZoneLinks(markdown: string): string[] {
  return [...markdown.matchAll(ZONE_LINK)].map((m) => m[1] ?? '');
}

export type ZoneLinksOptions = {
  /** `base` из astro.config.mjs. */
  base: string;
  /** Допустимые id; по умолчанию — все зоны `board-zones.ts`. */
  zoneIds?: ReadonlySet<string>;
};

function where(fileURL: URL | undefined): string {
  return fileURL ? relative(process.cwd(), fileURLToPath(fileURL)) : '<markdown>';
}

export function zoneLinksPlugin({ base, zoneIds = ZONE_IDS }: ZoneLinksOptions) {
  return {
    name: 'zone-links',
    definition(node, ctx) {
      if (node.url.startsWith(PREFIX)) {
        throw new Error(`${where(ctx.fileURL)}: ${ZONE_REFERENCE_ERROR}`);
      }
    },
    link(node, ctx) {
      if (!node.url.startsWith(PREFIX)) return;
      const id = node.url.slice(PREFIX.length);
      if (!zoneIds.has(id)) {
        throw new Error(`${where(ctx.fileURL)}: ссылка ${PREFIX}${id}: неизвестная зона`);
      }
      return {
        ...node,
        url: joinBase(base, `board/#${id}`),
        data: { ...node.data, hProperties: { className: ['zone-link'], 'data-zone': id } },
      };
    },
  } satisfies MdastPluginDefinition;
}
