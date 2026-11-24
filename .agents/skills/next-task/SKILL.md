---
name: next-task
description: >-
  Выполнить следующую задачу из docs/ROADMAP.md проекта witcher-board-game-helper
  (выбор задачи, реализация с тестами, simplifier, code-reviewer, PR, CI).
  Используйте на «/next-task», «выполни следующую задачу» и похожие просьбы.
---

Прочитайте `.claude/skills/next-task/SKILL.md` и строго выполните описанный там процесс шаг за шагом.

## Адаптация под Antigravity
- В шаге 6 (упрощение) и шаге 8 (code review) запускайте свежих субагентов через `invoke_subagent` с `TypeName: "simplifier"` и `TypeName: "code-reviewer"` (обёртки в `.agents/agents/`), передавая только поля входа, указанные в `.claude/skills/next-task/SKILL.md`.
