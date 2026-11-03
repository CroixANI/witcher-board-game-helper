# ROADMAP

> Правило: **1 задача = 1 сессия Claude Code = 1 ветка = 1 PR.** Исключение одно — R0.1, это bootstrap прямо в `main` до создания репозитория.
> Каждая задача самодостаточна при наличии `docs/SPEC.md` и этого файла. Ссылки вида «SPEC 8.5» ведут на разделы спецификации.
> Ветка: `<type>/<id>-<slug>`, например `feat/r2.1-wizard-engine`. Коммиты — Conventional Commits. PR: label + milestone, в описании `Задача: R?.?`.
> Общий DoD для любого PR (не повторяется в задачах): `npm run lint && npm run check && npm test && npm run build` зелёные локально и в CI; контентные изменения сверены с PDF правил, страницы указаны.
> Отмечайте выполненное: `- [x]`.

## Статус
| Этап | Milestone | Задачи |
|---|---|---|
| M0 Репозиторий и каркас | `M0 Репозиторий и каркас` | R0.1–R0.4 |
| M1 Контентная база | `M1 Контентная база` | R1.1–R1.6 |
| M2 Wizard подготовки | `M2 Wizard подготовки` | R2.1–R2.5 |
| M3 Движок и фазы I–III | `M3 Движок и фазы I–III` | R3.1–R3.5 |
| M4 Битва | `M4 Битва` | R4.1–R4.3 |
| M5 FAQ | `M5 FAQ` | R5.1–R5.4 |
| M6 PWA и polish | `M6 PWA и polish` | R6.1–R6.5 |

---

## M0 — Репозиторий и каркас

### - [ ] R0.1 Bootstrap: git, документы, репозиторий на GitHub
- **Цель:** локальная папка становится публичным репозиторием `CroixANI/witcher-board-game-helper` с документацией и без PDF правил.
- **Файлы:** `.gitignore`, `.nvmrc`, `README.md`, `LICENSE`, `NOTICE.md`, `CONTRIBUTING.md`, `docs/PLAN.md` (заменить актуальным брифом из проекта), `docs/SPEC.md`, `docs/ROADMAP.md`.
- **Шаги:** SPEC 14.1 шаги 1–4 и шаг 6 без защиты ветки (labels, milestones, Pages `build_type=workflow`).
- **Готово, когда:**
  - репозиторий публичный, topics и описание заданы, wiki выключена, разрешён только squash merge;
  - `git ls-files | grep -i pdf` пусто;
  - созданы 6 labels и 7 milestones; Pages source = GitHub Actions.
- **Проверка:**
  ```bash
  gh repo view CroixANI/witcher-board-game-helper --json visibility,repositoryTopics,homepageUrl
  gh label list -R CroixANI/witcher-board-game-helper
  gh api repos/CroixANI/witcher-board-game-helper/milestones --jq '.[].title'
  gh api repos/CroixANI/witcher-board-game-helper/pages --jq .build_type   # workflow
  ```

### - [ ] R0.2 Каркас Astro + Preact, layout, тема, страницы-заглушки
- **Ветка:** `chore/r0.2-astro-scaffold` · labels `infra` · M0.
- **Цель:** собираемый сайт с base path, тёмной темой, tab bar и 8 пустыми маршрутами.
- **Файлы:** `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `src/layouts/BaseLayout.astro`, `src/styles/tokens.css`, `src/styles/global.css`, `src/lib/url.ts`, `src/pages/{index,about}.astro`, `src/pages/setup/index.astro`, `src/pages/turn/index.astro`, `src/pages/turn/not-my-turn/index.astro`, `src/pages/reference/index.astro`, `src/pages/rules/index.astro`, `src/pages/faq/index.astro`, `public/{favicon.svg,robots.txt}`.
- **Шаги:** SPEC 14.1 шаг 7; конфиг SPEC 12.4 (только preact); тема SPEC 12.6; футер SPEC 12.8; скрипты SPEC 13.5 (`test`: `vitest run --passWithNoTests`, `validate:content` пока не подключать).
- **Готово, когда:**
  - `npm run build` создаёт `dist/` со всеми 8 маршрутами;
  - все внутренние ссылки начинаются с `/witcher-board-game-helper/`;
  - на 360 px нет горизонтальной прокрутки;
  - `astro check` без ошибок, TS strict.
- **Проверка:** `npm run build && npx serve dist` (или `npm run preview`) → открыть в DevTools mobile 360×740, пройти по tab bar. `grep -R 'href="/' dist | grep -v witcher-board-game-helper` пусто.

### - [ ] R0.3 CI, деплой, шаблоны GitHub, Dependabot
- **Ветка:** `chore/r0.3-ci-deploy` · `infra` · M0.
- **Цель:** PR проверяется CI, merge в `main` деплоит на Pages.
- **Файлы:** `.github/workflows/ci.yml` (только job `check`), `.github/workflows/deploy.yml`, `.github/ISSUE_TEMPLATE/{config.yml,faq-question.yml,rules-bug.yml}`, `.github/pull_request_template.md`, `.github/dependabot.yml`.
- **Шаги:**
  - SPEC 13.4, 12.7, 14.1 шаг 5;
  - до записи workflow проверить актуальные мажоры: `gh api repos/withastro/action/releases/latest --jq .tag_name` (то же для `actions/checkout`, `actions/setup-node`, `actions/deploy-pages`, `actions/upload-artifact`).
- **Готово, когда:**
  - на этом PR job `check` зелёный;
  - после merge `deploy` зелёный, сайт отвечает 200;
  - Issue Forms видны в «New issue».
- **Проверка:**
  ```bash
  gh pr checks --watch
  gh run list --workflow deploy --limit 1
  curl -sI https://croixani.github.io/witcher-board-game-helper/ | head -1
  ```

### - [ ] R0.4 Защита main и проверка процесса
- **Ветка:** `chore/r0.4-branch-protection` (PR с правкой README: «Сайт: <url>») · `infra` · M0.
- **Цель:** `main` защищена; процесс «ветка → PR → CI → squash» работает.
- **Шаги:** SPEC 14.1 шаг 6, блок «Защита main». Затем открыть этот PR.
- **Готово, когда:**
  - `gh api repos/CroixANI/witcher-board-game-helper/branches/main/protection --jq .required_status_checks.contexts` → `["check"]`;
  - прямой `git push origin main` отклоняется;
  - PR мержится только после зелёного `check`;
  - сайт открывается с телефона (критерий M0).
- **Проверка:** открыть URL Pages на телефоне; `git push origin HEAD:main` из тестовой ветки → ошибка protected branch.

---

## M1 — Контентная база

### - [ ] R1.1 Схемы коллекций и валидатор контента
- **Ветка:** `feat/r1.1-content-schemas` · `content`, `infra` · M1.
- **Цель:** все коллекции SPEC 5.2 объявлены, есть пример на каждую, сборка падает на битом контенте.
- **Файлы:**
  - `src/content.config.ts`;
  - `src/lib/graph-checks.ts` (пока только проверки 1, 5, 7 из SPEC 13.2);
  - `scripts/validate-content.ts`, `vitest.config.ts`, `tests/unit/content.test.ts`;
  - по 1 примеру в каждой коллекции (файлы из SPEC 5.3);
  - `src/data/board-zones.ts` (таблица SPEC 11.3), `src/data/start-resources.ts` (SPEC 7.1);
  - `package.json`: `test` = `vitest run && npm run validate:content`, `prebuild` = `npm run validate:content`.
- **Готово, когда:**
  - `npm test` зелёный;
  - негативные тесты-фикстуры (`tests/fixtures/bad/*`) ломают валидацию: узел без `pages`, `next` на несуществующий id, `rules: [nope]`, FAQ `source: rulebook` без `page`, неизвестная зона.
- **Проверка:** `npm test`; временно удалить `page:` в примере правила → `npm run build` падает с понятной ошибкой.

### - [ ] R1.2 SVG: иконки компонентов и действий
- **Ветка:** `feat/r1.2-svg-icons` · `content` · M1.
- **Цель:** собственный набор SVG по SPEC 9.2 и 11.2 + компонент `<Icon>`.
- **Файлы:**
  - `src/assets/svg/components/*.svg` (23 шт.);
  - `src/assets/svg/actions/*.svg` (4 перемещения + 7 действий локаций);
  - `src/assets/svg/icons/*.svg` (3 местности, 4 навыка, удар/укус, 5 абстрактных эмблем школ);
  - `src/components/Icon.astro`, `src/islands/Icon.tsx`;
  - `package.json` (`svgo`, `optimize:svg`);
  - страница-превью `src/pages/dev/icons.astro` (исключить из sitemap / `noindex`).
- **Правила:**
  - ни одного растрового фрагмента из PDF;
  - обобщённые символы (SPEC 11.1);
  - референсы — локально `docs/_ref/`, страницы 4–5, 7–8, 12, 25, 35–36.
- **Готово, когда:**
  - все файлы есть, каждый ≤ 3 КБ после svgo, у каждого `viewBox`;
  - иконки корректно выглядят в тёмной и светлой теме (`currentColor`);
  - превью-страница показывает все с подписями.
- **Проверка:** `npm run optimize:svg && find src/assets/svg -name '*.svg' -size +3k` пусто; визуально `/dev/icons/`.

### - [ ] R1.3 Схема игрового поля
- **Ветка:** `feat/r1.3-board-schematic` · `content`, `setup-wizard` · M1.
- **Цель:** `board-schematic.svg` и `BoardSchematic` (Preact) с подсветкой зон.
- **Файлы:** `src/assets/svg/board/board-schematic.svg`, `src/islands/BoardSchematic.tsx`, `src/pages/dev/board.astro`, `tests/unit/board-zones.test.ts`.
- **Требования:**
  - `viewBox 0 0 200 140`, зоны и `id` строго по SPEC 11.3;
  - пропсы `zones: string[]`, `labels?: Record<zone, string>`;
  - пульс подсветки, при `prefers-reduced-motion` — без анимации;
  - у ряда подписи «у колоды +1» / «дальняя −1».
- **Готово, когда:**
  - тест: каждый id из `board-zones.ts` есть в SVG и наоборот;
  - на `/dev/board/` переключатель подсвечивает любую зону;
  - схема ≤ 25 КБ, читается на 360 px.
- **Проверка:** `npm test`; открыть `/dev/board/` на мобильном viewport.

### - [ ] R1.4 Карточки правил: основы, подготовка, фазы I–III, трофеи, действия локаций
- **Ветка:** `content/r1.4-rules-part1` · `content` · M1.
- **Цель:** группы `basics`, `setup`, `phase1`, `phase2`, `phase3`, `trophies`, `location-actions` из SPEC 9.1 — около 45 файлов.
- **Файлы:** `src/content/rules/*.md`, `src/content/location-actions/*.yaml` (7), `src/content/schools/*.yaml` (5, SPEC 9.3).
- **Правила написания:**
  - пересказ своими словами, ≤ 150 слов;
  - `summary` ≤ 200 символов;
  - `important: true` для красных блоков «Важно» книги;
  - текст **каждой** карточки сверять с PDF (`pdftotext -f N -l N`).
- **Готово, когда:** все id из SPEC 9.1 этих групп существуют; `related` резолвятся; `npm test` зелёный.
- **Проверка:** скрипт `node -e` / тест сверяет список id в SPEC 9.1 с файлами (тест `rules-coverage.test.ts` парсит таблицу SPEC).

### - [ ] R1.5 Карточки правил: битва
- **Ветка:** `content/r1.5-rules-battle` · `content` · M1.
- **Цель:** группа `battle` из SPEC 9.1 (~25 файлов), стр. 15, 20–28.
- **Файлы:** `src/content/rules/*.md`.
- **Готово, когда:** `rules-coverage.test.ts` проходит полностью (все id SPEC 9.1); учтены расхождения SPEC 1.2 (завершение битвы, след при поражении, ведьмачий трофей один на школу).
- **Проверка:** `npm test`; ревью по чек-листу «расхождения SPEC 1.2».

### - [ ] R1.6 Компоненты и страницы `/reference/`, `/rules/`
- **Ветка:** `feat/r1.6-reference` · `content` · M1.
- **Цель:** справочник компонентов с фильтром и страницы правил.
- **Файлы:**
  - `src/content/components/*.yaml` (23, SPEC 9.2);
  - `src/components/{ComponentCard,RuleCard}.astro`;
  - `src/pages/reference/index.astro` (галерея + фильтр через radio + CSS `:has()`, работает без JS; блоки «Специализации», «Действия локаций»);
  - `src/pages/rules/index.astro`, `src/pages/rules/[id].astro`.
- **Готово, когда:**
  - фильтр «Карты / Жетоны / Прочее» работает без JS;
  - у каждого компонента — иконка, количество, «как отличить», «не путать с»;
  - каждая карточка правила имеет свою страницу со «стр. N».
- **Проверка:** `npm run build && npm run preview` → `/reference/`, `/rules/meditation/`; Lighthouse a11y ≥ 95 на `/reference/`.

---

## M2 — Wizard подготовки

### - [ ] R2.1 Движок wizard'а
- **Ветка:** `feat/r2.1-wizard-engine` · `setup-wizard`, `turn-wizard` · M2.
- **Цель:** `src/lib/wizard-engine.ts` по SPEC 6 — чистый TS, 100 % ветвей покрыто тестами.
- **Файлы:**
  - `src/lib/wizard-engine.ts`, `src/lib/safe-storage.ts`;
  - `src/lib/load-graph.ts` (собирает `Graph` из коллекций `setup` / `turn`);
  - `src/lib/graph-checks.ts` (все инварианты SPEC 13.2);
  - `tests/unit/{wizard-engine,safe-storage,graph}.test.ts`.
- **Готово, когда:** все функции SPEC 6.1 реализованы; `vitest --coverage` для `wizard-engine.ts` ≥ 95 % строк; `graph-checks` ловит тупик, сироту и петлю без выхода на фикстурах.
- **Проверка:** `npx vitest run --coverage`.

### - [ ] R2.2 Остров `WizardIsland`
- **Ветка:** `feat/r2.2-wizard-ui` · `setup-wizard` · M2.
- **Цель:** UI рендерит любой граф: 6 типов узлов, «Назад», «⟲ Заново», прогресс, сохранение, свёрнутые `RuleCard`, `ComponentChip`, `BoardSchematic` для `zones`.
- **Файлы:**
  - `src/islands/WizardIsland.tsx`;
  - `src/islands/steps/{Checklist,Choice,Question,Info,Loop,End}Step.tsx`;
  - `src/islands/RuleCard.tsx`;
  - `tests/unit/wizard-island.test.tsx` (`@testing-library/preact`).
- **Данные:** страница передаёт острову сериализованный граф (`JSON`) с уже отрендеренным HTML правил: Markdown → HTML на этапе сборки.
- **Готово, когда:**
  - работает на тестовом графе из 4 узлов;
  - «Назад» восстанавливает флаги;
  - перезагрузка сохраняет шаг;
  - без `localStorage` (мок бросает исключение) появляется баннер и всё работает;
  - фокус и `aria-live` по SPEC 6.7.
- **Проверка:** `npm test`; ручная проверка на `/dev/wizard/`.

### - [ ] R2.3 Контент подготовки: 13 узлов
- **Ветка:** `content/r2.3-setup-steps` · `setup-wizard`, `content` · M2.
- **Цель:** `src/content/setup/s00…s12.md` по таблице SPEC 7, страница `/setup/`.
- **Файлы:** `src/content/setup/*.md`, `src/pages/setup/index.astro`.
- **Проверить по PDF стр. 6–8:**
  - тексты каждого шага;
  - варианты 2 / 3 / 4 / 5 (`showIf` у пунктов чек-листа и у `s11`).
- **Сверить R2 (ориентация ряда):** формулировки «у колоды / дальняя от колоды». Если у пользователя есть игра — уточнить на поле.
- **Готово, когда:** граф-тесты зелёные для players 2–5; у каждого шага есть `pages`, `zones` (кроме s00/s09/s12), компоненты, `warning` там, где в книге «!» или легко перепутать (s02, s05, s07, s08, s10).
- **Проверка:** `npm test`; пройти `/setup/` для 2 и 5 игроков вручную.

### - [ ] R2.4 Итоговый экран, порядок планшетов, случайный первый игрок
- **Ветка:** `feat/r2.4-setup-summary` · `setup-wizard` · M2.
- **Цель:** `s12-summary` показывает таблицу SPEC 7.1 только для выбранного числа игроков и порядок выбора планшетов SPEC 7.2. В `s09` есть кнопка 🎲 (`crypto.getRandomValues`). «Перейти к ходу →» передаёт `players` в `twow:v1:params`.
- **Файлы:** `src/islands/SetupSummary.tsx`, `src/islands/RandomFirstPlayer.tsx`, `src/data/start-resources.ts`, `tests/unit/start-resources.test.ts`.
- **Готово, когда:** таблица совпадает с SPEC 7.1 для 2–5 (тест); после перехода `/turn/` не спрашивает число игроков.
- **Проверка:** `npm test`; ручной проход.

### - [ ] R2.5 E2E подготовки + job `e2e` в CI
- **Ветка:** `test/r2.5-setup-e2e` · `infra`, `setup-wizard` · M2.
- **Цель:** Playwright по SPEC 13.3 (`setup.spec.ts`, `links.spec.ts`), job `e2e` в `ci.yml`, контекст `e2e` в защите `main`.
- **Файлы:** `playwright.config.ts` (projects Pixel 7, iPhone 14; `webServer: npm run preview`), `tests/e2e/{setup,links}.spec.ts`, `.github/workflows/ci.yml`.
- **Готово, когда:** e2e зелёный в CI, скриншоты и отчёт — в артефактах; `gh api …/branches/main/protection --jq .required_status_checks.contexts` → `["check","e2e"]`.
- **Проверка:** `npm run build && npm run test:e2e`; `gh pr checks`.

---

## M3 — Движок и фазы I–III

### - [ ] R3.1 Параметры, школа, старт хода
- **Ветка:** `feat/r3.1-turn-start` · `turn-wizard` · M3.
- **Цель:**
  - `turn/start.yaml` (`t-params`, `t-school`, `t-start`) по SPEC 8.2;
  - страница `/turn/` с `WizardIsland graph="turn"`;
  - `SchoolBadge` (специализация выбранной школы, раскрывается, «только текущий уровень»);
  - в меню «Сменить школу / число игроков».
- **Файлы:** `src/content/turn/start.yaml`, `src/pages/turn/index.astro`, `src/islands/SchoolBadge.tsx`, временная заглушка `turn/phase3.yaml` с `turn-end`, чтобы граф был валиден.
- **Готово, когда:** при пустых params спрашиваются оба вопроса, при заданных — сразу `t-start`; бейдж виден на каждом шаге.
- **Проверка:** `npm test`; ручной проход.

### - [ ] R3.2 Фаза I и действия локаций
- **Ветка:** `content/r3.2-phase1` · `turn-wizard`, `content` · M3.
- **Цель:** `turn/phase1.yaml` и `turn/location-actions.yaml` по SPEC 8.2 и 8.4; иконки 4 способов перемещения и 7 действий.
- **Сверка с PDF:** стр. 12–14, 16–17, 35–36.
- **Готово, когда:**
  - цикл `p1-arrived ↔ p1-move-how` работает;
  - флаги `moved`, `pokerPlayed` ставятся;
  - все `la-*` возвращают в `p1-arrived`;
  - `p2-choose` пока заглушка `info` → `turn-end`.
- **Проверка:** `npm test`; пройти шаги 1–8 примера SPEC 17.1.

### - [ ] R3.3 Фаза II (медитация, исследование), фаза III, конец хода
- **Ветка:** `content/r3.3-phase2-3` · `turn-wizard`, `content` · M3.
- **Цель:**
  - `turn/phase2.yaml` без битвы: `b-target` пока `info` «Битва — в разработке» → `p3-discard`;
  - `turn/phase3.yaml` полностью: `p3-*`, `turn-end`, `game-won`;
  - экран «Ход завершён» → `resetTurn()`.
- **Сверка:** стр. 15–19, 29.
- **Готово, когда:**
  - `lostBattle` и `afterBattle` влияют на тексты `p3-draw` и `p3-discard` (проверено тестом с флагами);
  - после «Мой следующий ход» школа и число игроков сохранены, флаги сброшены.
- **Проверка:** `npm test`; ручной проход медитации (обе ветки) и исследования (обе ветки).

### - [ ] R3.4 Панель «Не забудь» и «Сейчас не мой ход»
- **Ветка:** `feat/r3.4-reminders-not-my-turn` · `turn-wizard`, `content` · M3.
- **Цель:**
  - `reminders/*.yaml` (12 пунктов SPEC 8.9) + `ReminderSheet` (bottom sheet, `Esc` закрывает, фокус-ловушка);
  - `not-my-turn/*.md` (9 ситуаций SPEC 8.8) + страница `/turn/not-my-turn/` (`<details>`; `showIf players` учитывается на клиенте по `twow:v1:params`, без JS видно всё);
  - ссылка «Не мой ход» на главной и в wizard'е.
- **Готово, когда:** панель открывается с любого шага и с клавиатуры; при 2 игроках «Сделать ставку» скрыта.
- **Проверка:** `npm test`; ручная проверка на 2 и 4 игроках.

### - [ ] R3.5 Тест сценария хода (без битвы) + e2e
- **Ветка:** `test/r3.5-turn-tests` · `turn-wizard` · M3.
- **Цель:**
  - `tests/unit/example-turn.test.ts`: шаги 1–9 SPEC 17.1, утверждение «дошли до `b-target`»;
  - `tests/e2e/turn.spec.ts`: то же кликами + «Ход завершён» через ветку исследования;
  - все граф-инварианты для `turn` при players 2–5.
- **Готово, когда:** CI зелёный.
- **Проверка:** `npm test && npm run test:e2e`.

---

## M4 — Битва

### - [ ] R4.1 Битва с монстром
- **Ветка:** `content/r4.1-battle-monster` · `turn-wizard`, `content` · M4.
- **Цель:**
  - `turn/battle-monster.yaml` по SPEC 8.5 (`b-target`, `bm-*`, `b-end-monster`);
  - заглушка `b-target` заменена;
  - `LoopStep`: счётчик хода битвы, подпись «Ходит: …», подсказка «тип атаки выбирает …» по номеру хода монстра и числу игроков (при 2 — всегда соперник).
- **Сверка:** стр. 20–27, 29, 31–32; учтены все пункты SPEC 1.2.
- **Готово, когда:**
  - все 3 исхода ведут к `b-end-monster` → `p3-discard`;
  - `bm-win-top: да` → `game-won`;
  - пункт про доп. стопку виден только при 4–5.
- **Проверка:** `npm test`; ручной проход трёх исходов.

### - [ ] R4.2 Битва с ведьмаком и ставки
- **Ветка:** `content/r4.2-battle-witcher` · `turn-wizard`, `content` · M4.
- **Цель:** `turn/battle-witcher.yaml` по SPEC 8.6.
- **Сверка:** стр. 15, 20–21, 27–28.
- **Готово, когда:**
  - при 2 игроках `bw-bets` и пункт ставок в `bw-end` скрыты;
  - `pokerPlayed` показывает предупреждение в `bw-check`;
  - `bw-check: нет` → `p2-choose`.
- **Проверка:** `npm test`; ручной проход для 2 и 3 игроков, оба исхода.

### - [ ] R4.3 Полный пример хода стр. 30–32
- **Ветка:** `test/r4.3-example-turn-full` · `turn-wizard` · M4.
- **Цель:** `example-turn.test.ts` и `turn.spec.ts` проходят все 21 шаг SPEC 17.1 до `turn-end`. Обновить SPEC 17, если граф изменился.
- **Готово, когда:** unit и e2e зелёные; граф-инварианты зелёные для players 2–5 (из каждого узла достижим `end`).
- **Проверка:** `npm test && npm run test:e2e`.

---

## M5 — FAQ

### - [ ] R5.1 Коллекция FAQ, страницы, шаблон
- **Ветка:** `feat/r5.1-faq-pages` · `faq` · M5.
- **Цель:**
  - `/faq/` (список, сгруппированный по фазе, якоря `#slug`);
  - `/faq/[slug]/`;
  - `src/content/faq/_template.md` (SPEC 10.3);
  - CONTRIBUTING: раздел «Как добавить вопрос».
- **Готово, когда:** вопрос из примера SPEC 5.3 отображается; `_template.md` не попадает в коллекцию; у каждого вопроса видны источник, «стр. N» и ссылки на карточки правил.
- **Проверка:** `npm run build`; `ls dist/faq/`.

### - [ ] R5.2 Pagefind, фильтры, кнопка «?» из wizard'а
- **Ветка:** `feat/r5.2-faq-search` · `faq` · M5.
- **Цель:** `astro-pagefind`, остров `FaqSearch` (JS API, фильтры phase/tag, URL-параметры), кнопка «?» в `WizardIsland` → `/faq/?phase=…` (SPEC 10.2).
- **Готово, когда:**
  - поиск «медитация» находит вопрос;
  - `?phase=battle` фильтрует;
  - без JS виден полный список;
  - base path корректен в индексе.
- **Проверка:** `tests/e2e/faq.spec.ts`; `npm run test:e2e`.

### - [ ] R5.3 Стартовое наполнение FAQ (22 вопроса)
- **Ветка:** `content/r5.3-faq-seed` · `faq`, `content` · M5.
- **Цель:** 22 файла по таблице SPEC 10.4, своими словами.
- **Источники:**
  - для `official-faq` — пересказ пункта, `sourceRef`; PDF FAQ пользователь при необходимости кладёт в `docs/_ref/` (не коммитится);
  - `hand-limit-house` — по решению D6.
- **Готово, когда:** 22 файла валидны; у всех `rulebook` есть `page`; у всех есть ≥ 1 `rules`.
- **Проверка:** `npm test`; поиск по 3 случайным вопросам.

### - [ ] R5.4 Процесс пополнения: Issue Form → PR
- **Ветка:** `chore/r5.4-faq-flow` · `faq`, `infra` · M5.
- **Цель:**
  - проверить и дополнить `faq-question.yml` (поле «Теги»);
  - в README — короткая инструкция;
  - опционально workflow `faq-issue-to-pr.yml` (по label `faq-approved` создаёт ветку и черновой файл из Issue Form и открывает PR). Делать только если пользователь подтвердит, иначе пропустить.
- **Готово, когда:** тестовое Issue создано через форму, по нему вручную сделан PR `Closes #N`, после merge вопрос на сайте.
- **Проверка:** ссылка на сайт с новым вопросом.

---

## M6 — PWA и polish

### - [ ] R6.1 PWA / offline
- **Ветка:** `feat/r6.1-pwa` · `infra` · M6.
- **Цель:** `@vite-pwa/astro` по SPEC 12.5, свои иконки 192/512/maskable, индикатор offline в футере.
- **Готово, когда:**
  - Chrome DevTools → Application: manifest валиден, SW активен;
  - после первого визита в режиме Offline открываются все маршруты, поиск FAQ и wizard'ы;
  - на iOS «На экран Домой» работает.
- **Проверка:** e2e `offline.spec.ts` (`context.setOffline(true)` после прогрева); Lighthouse PWA installable.

### - [ ] R6.2 Доступность
- **Ветка:** `fix/r6.2-a11y` · `infra` · M6.
- **Цель:** `@axe-core/playwright` на всех маршрутах и ключевых узлах wizard'ов; клавиатурная навигация; контраст AA; `prefers-reduced-motion`.
- **Готово, когда:** `a11y.spec.ts` — 0 serious/critical; Lighthouse A11y ≥ 95 на `/`, `/setup/`, `/turn/`, `/faq/`.
- **Проверка:** `npm run test:e2e -- a11y`.

### - [ ] R6.3 Производительность и шрифты
- **Ветка:** `perf/r6.3-budget` · `infra` · M6.
- **Цель:**
  - self-hosted subset шрифта заголовков ≤ 40 КБ;
  - JS на `/turn/` ≤ 40 КБ gzip;
  - Lighthouse mobile Perf ≥ 90;
  - бюджет проверяется скриптом `scripts/check-budget.ts` в CI.
- **Проверка:** `npm run build && npx tsx scripts/check-budget.ts`.

### - [ ] R6.4 Тестовая партия
- **Ветка:** — (без кода). Результат — issues с label `rules` / `faq`.
- **Цель:** сыграть партию (2–3 игрока), где каждый пользуется сайтом со своего телефона.
- **Чек-лист:**
  - подготовка по wizard'у от начала до конца;
  - ≥ 1 битва с монстром и, если получится, с ведьмаком;
  - проверить ориентацию ряда (риск R2);
  - записывать вопросы игроков.
- **Готово, когда:** заведены issues по всем найденным проблемам и вопросам.

### - [ ] R6.5 Правки по тестовой партии
- **Ветка:** `fix/r6.5-playtest` (или несколько PR по issue) · по меткам · M6.
- **Цель:** закрыть issues R6.4, новые вопросы → FAQ.
- **Готово, когда:** все issues M6 закрыты; README обновлён; создан релиз `v1.0.0` (`gh release create v1.0.0 --generate-notes`).
