---
name: pr-sweep
description: Один цикл обработки открытого PR в witcher-board-game-helper — собрать комментарии пользователя и упавшие проверки CI, классифицировать, исправить обоснованные, запушить и ответить в PR. Используйте на «/pr-sweep N», «разбери комментарии в PR», «почини CI в PR».
---

# /pr-sweep <номер PR>

Один цикл за вызов. Merge не делать.

`R=$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')`. Только REST: GraphQL в облачных сессиях закрыт.

## 1. Найти PR
- Номер берётся из аргумента или из таблицы статусов ROADMAP (строка `review`).
- `ref=$(gh api repos/$R/pulls/$N --jq .head.ref)`
- `git fetch origin && git switch "$ref" && git pull --ff-only`

## 2. Собрать
- **Проверки:**
  ```bash
  gh api "repos/$R/commits/$(git rev-parse HEAD)/check-runs" --jq '.check_runs[] | select(.status != "completed" or (.conclusion | IN("success","skipped","neutral") | not)) | "\(.name)\t\(.status)\t\(.conclusion)\t\(.html_url)"'
  ```
- **Нерешённые треды ревью:**
  ```bash
  gh api repos/$R/pulls/$N/ccr/review_threads
  ```
  Взять `isResolved == false`. Если маршрут недоступен (локально), использовать `gh api repos/$R/pulls/$N/comments`.
- **Общие комментарии:**
  ```bash
  gh api repos/$R/issues/$N/comments --jq '.[] | "\(.id)\t\(.user.login)\t\(.body)"'
  ```

## 3. Классифицировать (показать таблицу пользователю)
- **Must fix** — корректность, правила игры, упавший CI, просьба пользователя.
- **Optional** — стиль, необязательное улучшение. Исправлять только если пользователь выберет.
- **Invalid** — недоразумение или неприменимо. Подготовить короткий вежливый ответ с причиной.

Пометить каждый пункт `code` или `test`. При низкой уверенности спросить пользователя до правок.

## 4. Исправить одной пачкой
- Правки с тестами по правилам `/next-task` (шаг 5): новое поведение — новые тесты.
- `npm run lint && npm run check && npm test && npm run build` один раз на пачку (+ e2e, если затронуты сценарии).
- Если правки существенные (новая логика или > ~50 строк), один раз запустите `code-reviewer` с `rereview: true`.
- Коммит `fix: <что> (review #N)`, `git push`.

## 5. Ответить
- В тред:
  ```bash
  gh api repos/$R/pulls/$N/comments/<comment_id>/replies -f body="Исправлено в <sha>: …"
  ```
- В общий комментарий:
  ```bash
  gh api repos/$R/issues/$N/comments -f body="…"
  ```
- Треды пользователя **не резолвить**: их закрывает он сам.

## 6. Отчёт
Отчёт в ≤ 6 строк:
- новые пункты и сколько в каждой категории;
- исправления + SHA;
- результат тестов;
- ответы;
- что осталось;
- `scripts/session/ci-wait.sh`: статус CI.
