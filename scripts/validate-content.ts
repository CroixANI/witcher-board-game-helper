/**
 * Проверка контента сверх Zod-схем Astro (SPEC 5.2, 13.2).
 * Запуск: `npm run validate:content` (входит в `npm test` и `prebuild`).
 *
 * 1. Каждый файл коллекции проходит Zod-схему; ссылки на rules/components — на существующие id.
 * 2. Граф-инварианты 1, 5, 7 (src/lib/graph-checks.ts) для графов setup и turn.
 * 3. `components[].usedIn` ссылаются на существующие узлы.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'astro/zod';
import { ZONE_IDS } from '../src/data/board-zones';
import {
  COLLECTIONS,
  createSchemas,
  Id,
  type CollectionName,
  type RefCollection,
} from '../src/lib/content-schemas';
import {
  checkGraphRefs,
  checkIcons,
  checkPagesAndRules,
  checkZones,
  type GraphNode,
} from '../src/lib/graph-checks';

export { COLLECTIONS };

export type ValidateOptions = { contentDir: string; svgDir: string };
export type ValidateResult = { errors: string[]; counts: Record<CollectionName, number> };

type Schemas = ReturnType<typeof createSchemas<z.ZodType<string>>>['collections'];
type Entry<K extends CollectionName> = { file: string; data: z.output<Schemas[K]> };
type RawEntry = { id: string; file: string; raw: unknown };

const NAMES = Object.keys(COLLECTIONS) as CollectionName[];

/** Файлы в папке рекурсивно, пути относительно неё через `/`. Нет папки — пусто. */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(dir, join(d.parentPath, d.name)).split(sep).join('/'))
    .sort();
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function readEntry(path: string, ext: string): unknown {
  const text = readFileSync(path, 'utf8');
  if (ext === '.yaml') return parseYaml(text);
  const match = FRONTMATTER.exec(text);
  if (!match) throw new Error('нет frontmatter (--- … ---)');
  return parseYaml(match[1] ?? '');
}

function loadRaw(contentDir: string, name: CollectionName, errors: string[]): RawEntry[] {
  const c: { dir: string; ext: string; exclude?: readonly string[] } = COLLECTIONS[name];
  const entries: RawEntry[] = [];
  for (const rel of listFiles(join(contentDir, c.dir))) {
    if (!rel.endsWith(c.ext) || c.exclude?.includes(rel)) continue;
    const file = `${c.dir}/${rel}`;
    try {
      entries.push({
        id: rel.slice(0, -c.ext.length),
        file,
        raw: readEntry(join(contentDir, file), c.ext),
      });
    } catch (e) {
      errors.push(`${file}: не читается: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return entries;
}

/** Значение по пути issue: отличает «поле не указано» от «поле неверное». */
function valueAt(value: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>(
    (v, key) =>
      v !== null && typeof v === 'object' ? (v as Record<PropertyKey, unknown>)[key] : undefined,
    value,
  );
}

function formatIssue(file: string, value: unknown, issue: z.core.$ZodIssue): string {
  if (!issue.path.length) return `${file}: ${issue.message}`;
  const missing = valueAt(value, issue.path) === undefined;
  return `${file}: ${issue.path.join('.')}: ${missing ? 'обязательное поле не указано' : issue.message}`;
}

export function validateContent({ contentDir, svgDir }: ValidateOptions): ValidateResult {
  const errors: string[] = [];
  const raw = Object.fromEntries(NAMES.map((n) => [n, loadRaw(contentDir, n, errors)])) as Record<
    CollectionName,
    RawEntry[]
  >;
  const ids = (n: RefCollection) => new Set(raw[n].map((e) => e.id));
  const known: Record<RefCollection, Set<string>> = {
    rules: ids('rules'),
    components: ids('components'),
  };

  // Ссылка = id существующей записи коллекции (как reference() в Astro).
  const { collections: schemas } = createSchemas((collection) =>
    Id.refine((v) => known[collection].has(v), {
      error: (iss) => `нет записи ${collection}/${String(iss.input)}`,
    }),
  );

  const failed = new Set<CollectionName>();
  function parse<K extends CollectionName>(name: K): Entry<K>[] {
    const schema: z.ZodType = schemas[name];
    return raw[name].flatMap(({ file, raw: value }) => {
      const res = schema.safeParse(value);
      if (res.success) return [{ file, data: res.data as z.output<Schemas[K]> }];
      failed.add(name);
      errors.push(...res.error.issues.map((i) => formatIssue(file, value, i)));
      return [];
    });
  }

  const components = parse('components');
  const locationActions = parse('locationActions');
  const setup = parse('setup');
  const turn = parse('turn');
  for (const name of ['rules', 'schools', 'reminders', 'notMyTurn', 'faq'] as const) parse(name);

  // Граф проверяем, только если все его файлы прошли схему: иначе ошибки каскадом.
  const graphs: [string, CollectionName, GraphNode[], string[]][] = [
    ['setup', 'setup', setup.map((e) => e.data.node), []],
    ['turn', 'turn', turn.flatMap((e) => e.data.nodes), turn.map((e) => e.data.entry)],
  ];
  const nodeIds = new Set<string>();
  for (const [graph, name, nodes, entries] of graphs) {
    if (failed.has(name)) continue;
    errors.push(
      ...checkGraphRefs(graph, nodes, entries),
      ...checkPagesAndRules(graph, nodes, known.rules),
      ...checkZones(graph, nodes, ZONE_IDS),
    );
    for (const n of nodes) nodeIds.add(n.id);
  }

  if (!failed.has('setup') && !failed.has('turn')) {
    for (const { file, data } of components) {
      for (const id of data.usedIn) {
        if (!nodeIds.has(id)) errors.push(`${file}: usedIn: несуществующий узел ${id}`);
      }
    }
  }

  errors.push(
    ...checkIcons(
      [
        ...components.map((e) => ({ source: e.file, icon: `components/${e.data.icon}` })),
        ...locationActions.map((e) => ({ source: e.file, icon: `actions/${e.data.icon}` })),
      ],
      new Set(listFiles(svgDir)),
    ),
  );

  const counts = Object.fromEntries(NAMES.map((n) => [n, raw[n].length])) as Record<
    CollectionName,
    number
  >;
  return { errors, counts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, counts } = validateContent({
    contentDir: 'src/content',
    svgDir: 'src/assets/svg',
  });
  if (errors.length) {
    console.error(
      `validate-content: ошибок — ${errors.length}\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`,
    );
    process.exit(1);
  }
  const summary = Object.entries(counts)
    .map(([n, c]) => `${n}: ${c}`)
    .join(', ');
  console.log(`validate-content: OK (${summary})`);
}
