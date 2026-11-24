---
name: pr-sweep
description: >-
  Один цикл обработки открытого PR в witcher-board-game-helper — собрать
  комментарии и упавший CI, классифицировать, исправить, запушить и ответить.
  Используйте на «/pr-sweep N», «разбери комментарии в PR», «почини CI в PR».
---

Прочитайте `.claude/skills/pr-sweep/SKILL.md` и строго выполните описанный там процесс шаг за шагом.

## Адаптация под Antigravity
- При необходимости повторного ревью (шаг 4) запускайте субагента через `invoke_subagent` с `TypeName: "code-reviewer"` (обёртка в `.agents/agents/code-reviewer.md`).
