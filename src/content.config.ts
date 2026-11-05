// Коллекции контента (SPEC 5.1–5.2). Схемы и раскладка папок — в src/lib/content-schemas.ts:
// их же использует scripts/validate-content.ts без Astro.
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { COLLECTIONS, createSchemas, type CollectionName } from './lib/content-schemas';

export { Condition, Expansion, Id, Page, Pages, Phase, PlayerCount } from './lib/content-schemas';

const { collections: schemas } = createSchemas(reference);

function collection<K extends CollectionName>(name: K) {
  const c: { dir: string; ext: string; exclude?: readonly string[] } = COLLECTIONS[name];
  const pattern = [`**/*${c.ext}`, ...(c.exclude ?? []).map((f) => `!${f}`)];
  return defineCollection({
    loader: glob({ pattern, base: `./src/content/${c.dir}` }),
    schema: schemas[name],
  });
}

export const collections = {
  rules: collection('rules'),
  components: collection('components'),
  schools: collection('schools'),
  locationActions: collection('locationActions'),
  setup: collection('setup'),
  turn: collection('turn'),
  reminders: collection('reminders'),
  notMyTurn: collection('notMyTurn'),
  faq: collection('faq'),
};
