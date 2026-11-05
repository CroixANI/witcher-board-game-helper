/**
 * Zod-схемы коллекций контента (SPEC 5.2).
 *
 * Схемы не зависят от `astro:content`, чтобы ими пользовались и Astro (`src/content.config.ts`),
 * и `scripts/validate-content.ts` (tsx / Vitest). Ссылки на другие коллекции передаются
 * фабрикой `ref`: Astro подставляет `reference()`, валидатор — проверку по реальным id.
 */
import { z } from 'astro/zod';

// ── общие типы ────────────────────────────────────────────
export const Page = z.number().int().min(1).max(36); // стр. книги правил
export const Pages = z.union([Page, z.array(Page).nonempty()]);
export const Expansion = z.enum(['base']).default('base'); // задел под дополнения
export const Phase = z.enum(['setup', 'phase1', 'phase2', 'battle', 'phase3', 'general']);
export const PlayerCount = z.number().int().min(2).max(5);
export const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/); // kebab-case

/** Условие показа узла / варианта / перехода. Все поля через AND, массив = OR значений. */
export const Condition = z
  .object({
    players: z.array(PlayerCount).nonempty().optional(),
    flags: z.record(z.string(), z.boolean()).optional(), // { lostBattle: true }
    missingParam: z.enum(['players', 'school']).optional(), // параметр ещё не задан
  })
  .strict();

/** Коллекции, на которые можно ссылаться из других коллекций. */
export type RefCollection = 'rules' | 'components';

/** Где лежат файлы коллекции (папка внутри `src/content/`, расширение, исключения). */
export type CollectionLayout = { dir: string; ext: string; exclude?: readonly string[] };

export const COLLECTIONS = {
  rules: { dir: 'rules', ext: '.md' },
  components: { dir: 'components', ext: '.yaml' },
  schools: { dir: 'schools', ext: '.yaml' },
  locationActions: { dir: 'location-actions', ext: '.yaml' },
  setup: { dir: 'setup', ext: '.md' },
  turn: { dir: 'turn', ext: '.yaml' },
  reminders: { dir: 'reminders', ext: '.yaml' },
  notMyTurn: { dir: 'not-my-turn', ext: '.md' },
  faq: { dir: 'faq', ext: '.md', exclude: ['_template.md'] },
} as const satisfies Record<string, CollectionLayout>;

export type CollectionName = keyof typeof COLLECTIONS;

const SvgFile = z.string().regex(/^[a-z0-9-]+\.svg$/);

export function createSchemas<R extends z.ZodType>(ref: (collection: RefCollection) => R) {
  // ── карточки правил ──────────────────────────────────────
  const rules = z
    .object({
      title: z.string().min(3),
      page: Pages,
      group: z.enum([
        'basics',
        'phase1',
        'phase2',
        'battle',
        'phase3',
        'trophies',
        'location-actions',
        'schools',
        'setup',
      ]),
      summary: z.string().max(200), // 1 строка для свёрнутого состояния
      important: z.boolean().default(false), // красный блок «Важно» в книге
      related: z.array(ref('rules')).default([]),
      expansion: Expansion,
    })
    .strict();

  // ── компоненты ───────────────────────────────────────────
  const components = z
    .object({
      name: z.string(),
      kind: z.enum(['card', 'token', 'board', 'misc']),
      count: z.number().int().positive(),
      perPlayer: z.boolean().default(false), // «в каждом наборе игрока»
      icon: SvgFile, // файл в src/assets/svg/components/
      howToTell: z.string(), // «как отличить»
      confusedWith: z.array(ref('components')).default([]),
      usedIn: z.array(Id).default([]), // id узлов setup/turn — проверяет validate-content
      rules: z.array(ref('rules')).default([]),
      rulesPage: Pages,
      expansion: Expansion,
    })
    .strict();

  // ── школы ────────────────────────────────────────────────
  const schools = z
    .object({
      name: z.string(), // «Школа Волка»
      specialization: z.string(), // «Владение мечом»
      effect: z.string(), // текст с плейсхолдерами (1–2)
      timing: z.string(), // «Один раз за битву: …»
      page: Pages,
      color: z.string().regex(/^#[0-9a-f]{6}$/i), // цвет подставки/акцента
      expansion: Expansion,
    })
    .strict();

  // ── действия локаций ─────────────────────────────────────
  const locationActions = z
    .object({
      title: z.string(),
      iconHint: z.string(), // как выглядит символ на поле (словами)
      icon: SvgFile, // файл в src/assets/svg/actions/
      steps: z.array(z.string()).nonempty(),
      rule: ref('rules'),
      page: Pages,
    })
    .strict();

  // ── узлы wizard'ов (общая часть) ─────────────────────────
  const Next = z.union([
    Id, // безусловный переход
    z.array(z.object({ when: Condition.optional(), to: Id }).strict()).nonempty(), // первый подходящий
  ]);
  const Option = z
    .object({
      label: z.string(),
      hint: z.string().optional(),
      next: Id,
      showIf: Condition.optional(),
      set: z.record(z.string(), z.boolean()).optional(), // установить флаги хода
      setParam: z
        .object({
          key: z.enum(['players', 'school']),
          value: z.union([z.number(), z.string()]),
        })
        .strict()
        .optional(),
    })
    .strict();
  const Answer = Option.omit({ label: true });
  const ChecklistItem = z
    .object({
      text: z.string(),
      showIf: Condition.optional(),
      rule: ref('rules').optional(),
    })
    .strict();
  const NodeBase = {
    id: Id,
    title: z.string(),
    phase: Phase,
    pages: Pages, // ОБЯЗАТЕЛЬНО: стр. правил
    rules: z.array(ref('rules')).default([]),
    components: z.array(ref('components')).default([]),
    note: z.string().optional(), // короткий подзаголовок
    warning: z.string().optional(), // «⚠ Не перепутать»
    showIf: Condition.optional(), // узел пропускается, если false
    faqPhase: Phase.optional(), // фильтр кнопки «?»; по умолчанию = phase
  };
  const WizardNode = z.discriminatedUnion('type', [
    z
      .object({
        ...NodeBase,
        type: z.literal('step'),
        checklist: z.array(ChecklistItem).nonempty(),
        zones: z.array(z.string()).default([]),
        next: Next,
      })
      .strict(),
    z
      .object({ ...NodeBase, type: z.literal('info'), body: z.string().optional(), next: Next })
      .strict(),
    z.object({ ...NodeBase, type: z.literal('choice'), options: z.array(Option).min(2) }).strict(),
    z
      .object({
        ...NodeBase,
        type: z.literal('question'),
        question: z.string(),
        yes: Answer.extend({ label: z.string().default('Да') }),
        no: Answer.extend({ label: z.string().default('Нет') }),
      })
      .strict(),
    z
      .object({
        ...NodeBase,
        type: z.literal('loop'),
        counterKey: z.string(), // 'battleTurn'
        actorLabel: z.string().optional(), // «Ходит: {actor}»
        checklist: z.array(ChecklistItem).nonempty(),
        options: z.array(Option.extend({ increment: z.boolean().default(false) })).min(2),
      })
      .strict(),
    z
      .object({
        ...NodeBase,
        type: z.literal('end'),
        resetTo: Id.optional(),
        outcome: z.enum(['turn-complete', 'game-won', 'setup-complete']),
      })
      .strict(),
  ]);

  // ── подготовка: 1 файл = 1 узел, тело Markdown = подробный текст ──
  const setup = z
    .object({
      order: z.number(), // порядок; переходы по умолчанию — к следующему order
      node: WizardNode,
    })
    .strict();

  // ── ход: 1 файл = подграф ────────────────────────────────
  const turn = z
    .object({
      subgraph: z.enum([
        'start',
        'phase1',
        'location-actions',
        'phase2',
        'battle-monster',
        'battle-witcher',
        'phase3',
      ]),
      entry: Id,
      nodes: z.array(WizardNode).nonempty(),
    })
    .strict();

  // ── «Не забудь» ──────────────────────────────────────────
  const reminders = z
    .object({
      text: z.string(),
      order: z.number(),
      rule: ref('rules'),
      page: Pages,
      phases: z.array(Phase).default(['general']),
    })
    .strict();

  // ── «Сейчас не мой ход» ─────────────────────────────────
  const notMyTurn = z
    .object({
      title: z.string(),
      order: z.number(),
      trigger: z.string(),
      showIf: Condition.optional(),
      rules: z.array(ref('rules')).nonempty(),
      pages: Pages,
    })
    .strict();

  // ── FAQ ──────────────────────────────────────────────────
  const faq = z
    .object({
      question: z.string().min(10).endsWith('?'),
      tags: z.array(z.string()).nonempty(),
      phase: Phase,
      source: z.enum(['rulebook', 'official-faq', 'house']),
      page: Page.optional(),
      sourceRef: z.string().optional(), // «Офиц. FAQ, Базовая игра, п. 8»
      sourceUrl: z.url().optional(),
      rules: z.array(ref('rules')).default([]),
      updated: z.coerce.date(),
      expansion: Expansion,
    })
    .strict()
    .refine((f) => f.source !== 'rulebook' || f.page, { message: 'rulebook → нужен page' });

  return { rules, components, schools, locationActions, setup, turn, reminders, notMyTurn, faq };
}
