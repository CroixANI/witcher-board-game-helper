# Как участвовать

## Процесс
- **1 задача = 1 ветка = 1 PR.** Задачи — в [`docs/ROADMAP.md`](docs/ROADMAP.md), в описании PR укажите `Задача: R?.?`.
- Ветка `main` защищена: только через PR с зелёным CI, слияние — squash.
- Имена веток: `<type>/<id>-<slug>`, например `feat/r2.1-wizard-engine`, `content/r1.4-rules-part1`, `fix/…`, `chore/…`, `test/…`.
- Коммиты — [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `content:`, `chore:`, `test:`, `docs:`.
- Перед PR: `npm run lint && npm run check && npm test && npm run build`.

## Правила для контента
- **Только своими словами.** Не копируйте тексты книги правил, карт и официального FAQ — пересказывайте.
- **Всегда указывайте страницу** книги правил (`page` / `pages`). Сверяйте с книгой, а не с памятью или пересказом.
- **Никаких изображений из книги правил, карт или поля.** Только собственные SVG (см. SPEC, раздел 11).
- Книга правил главнее SPEC и брифа. Нашли расхождение — issue «Ошибка в правилах / wizard'е».

## Добавить вопрос в FAQ
1. Скопируйте `src/content/faq/_template.md` → `src/content/faq/<slug>.md` (`slug` — латиницей через дефис, например `meditation-last-trophy`).
2. Заполните frontmatter:
   - `question` — вопрос, заканчивается на `?`;
   - `tags` — 1–3 тега;
   - `phase` — `setup` | `phase1` | `phase2` | `battle` | `phase3` | `general`;
   - `source` — `rulebook` (тогда обязателен `page`) | `official-faq` (+ `sourceRef`) | `house` (договорённость стола);
   - `rules` — id связанных карточек правил (необязательно);
   - `updated` — дата.
3. Ответ — коротко, своими словами, со ссылкой «(стр. N)».
4. Через веб-интерфейс GitHub: *Add file → Create new file* → *Commit to a new branch* → *Create pull request*. CI проверит схему, после merge сайт обновится.

Нет доступа к репозиторию — создайте issue по форме **«Новый вопрос в FAQ»**.

## Сообщить об ошибке в правилах
Issue по форме **«Ошибка в правилах / wizard'е»**: где (URL или шаг wizard'а), что написано, как по правилам, страница книги.
