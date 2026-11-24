# Ведьмак: Старый мир — помощник

Фанатский помощник для настольной игры «Ведьмак: Старый мир» (базовая игра, 2–5 игроков). Статический mobile-first сайт: каждый игрок открывает его на своём телефоне.

**Сайт:** https://croixani.github.io/witcher-board-game-helper/

## Что умеет
- **Подготовка** — пошаговый wizard раскладки: чек-листы, схема поля с подсветкой зоны, «не перепутать», раздача карт и золота по местам.
- **Мой ход** — wizard по фазам I–III и битве: задаёт вопросы, ведёт по веткам, показывает правило со страницей книги. Ресурсы не хранит.
- **Не мой ход** — что может понадобиться от вас, пока ходят другие.
- **Справочник** — компоненты («как отличить»), специализации школ, действия локаций, карточки правил.
- **FAQ** — вопросы, возникшие за столом, с поиском, работающим offline.

## Документация
- [`docs/SPEC.md`](docs/SPEC.md) — спецификация.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — задачи по этапам (1 задача = 1 ветка = 1 PR).
- [`docs/PLAN.md`](docs/PLAN.md) — исходный бриф (решения в SPEC имеют приоритет).

## Запуск локально
```bash
nvm use            # Node 26 (.nvmrc)
npm ci
npm run dev        # http://localhost:4321/witcher-board-game-helper/
```

## Тесты
```bash
npm run lint                     # ESLint + Prettier
npm run check                    # astro check (TypeScript strict)
npm test                         # unit (Vitest) + проверка контента (validate:content)
npm run build                    # сборка в dist/ (тоже валидирует контент)

# E2E (Playwright, мобильные viewport'ы Pixel 7 и iPhone 14) — проверяют собранный dist/
npx playwright install chromium webkit   # один раз
npm run build && npm run test:e2e
```

Перед PR должны пройти `npm run lint && npm run check && npm test && npm run build` и E2E. CI гоняет то же самое на каждом PR (jobs `check` и `e2e`).

`scripts/session/e2e.sh` запускает E2E в любом окружении. Если браузеры Playwright установлены, он вызывает обычный `npm run test:e2e`. Если их нет — например, в облачной сессии Claude Code, где скачивание браузеров заблокировано, — он берёт уже установленный Chromium и гоняет только Pixel 7. iPhone 14 (WebKit) в этом случае проверяет CI.

## Как добавить вопрос в FAQ
- **Есть доступ к репозиторию:** откройте [`src/content/faq/_template.md`](src/content/faq/_template.md), создайте файл `<slug>.md` в `src/content/faq/` (*Add file → Create new file*), заполните поля и откройте PR. После зелёного CI и merge сайт обновится сам.
- **Нет доступа / заявка с телефона:** создайте issue по форме [«Новый вопрос в FAQ»](https://github.com/CroixANI/witcher-board-game-helper/issues/new?template=faq-question.yml) (вопрос, фаза; по желанию — теги, решение за столом и страница правил). Владелец оформит файл по шаблону и закроет issue через PR с `Closes #N`.

Подробный формат полей и правила пересказа — в [`CONTRIBUTING.md`](CONTRIBUTING.md#как-добавить-вопрос).

## Правообладатели и лицензия
Фанатский некоммерческий проект. «Ведьмак: Старый мир» © CD PROJEKT RED, Go On Board; русское издание — GaGa Games. Тексты на сайте — пересказ правил, иллюстрации — собственные схемы. Номера страниц указаны по книге правил из коробки игры.

Код распространяется под лицензией [MIT](LICENSE); на контент игры она не распространяется — см. [`NOTICE.md`](NOTICE.md).
