// Коллекции контента (SPEC 5.1–5.2). Схемы и раскладка папок — в src/lib/content-schemas.ts:
// их же использует scripts/validate-content.ts без Astro.
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  COLLECTIONS,
  createSchemas,
  type CollectionLayout,
  type CollectionName,
} from './lib/content-schemas';

export { Condition, Expansion, Id, Page, Pages, Phase, PlayerCount } from './lib/content-schemas';

const schemas = createSchemas({ rules: reference('rules'), components: reference('components') });

/** Glob-loader по раскладке коллекции. Коллекции объявлены явно (без обобщённого хелпера),
 * чтобы Astro вывел конкретный тип `data` для каждой коллекции. */
function loader(name: CollectionName) {
  const c: CollectionLayout = COLLECTIONS[name];
  const pattern = [`**/*${c.ext}`, ...(c.exclude ?? []).map((f) => `!${f}`)];
  return glob({ pattern, base: `./src/content/${c.dir}` });
}

export const collections = {
  rules: defineCollection({ loader: loader('rules'), schema: schemas.rules }),
  components: defineCollection({ loader: loader('components'), schema: schemas.components }),
  schools: defineCollection({ loader: loader('schools'), schema: schemas.schools }),
  locationActions: defineCollection({
    loader: loader('locationActions'),
    schema: schemas.locationActions,
  }),
  setup: defineCollection({ loader: loader('setup'), schema: schemas.setup }),
  turn: defineCollection({ loader: loader('turn'), schema: schemas.turn }),
  reminders: defineCollection({ loader: loader('reminders'), schema: schemas.reminders }),
  notMyTurn: defineCollection({ loader: loader('notMyTurn'), schema: schemas.notMyTurn }),
  faq: defineCollection({ loader: loader('faq'), schema: schemas.faq }),
};
