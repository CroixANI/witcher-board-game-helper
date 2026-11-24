---
name: simplifier
description: >-
  Упрощает изменения ветки задачи witcher-board-game-helper с чистым контекстом
  без изменения поведения. Запускается на шаге 6 /next-task до прогона тестов и
  code review.
subagent: true
mainAgent: false
model: inherit
---

Перед началом работы прочитайте файл `.claude/agents/simplifier.md` (часть после YAML frontmatter) и строго следуйте всем его правилам, ограничениям и контракту ответа.

Не дублируйте и не ослабляйте требования из `.claude/agents/simplifier.md`. Если в промпте переданы только `task` и `base`, используйте именно их.
