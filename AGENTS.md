@[CLAUDE.md](CLAUDE.md)

## Настройки для Antigravity
- Скилы и slash-команды (`/next-task`, `/pr-sweep`) оформлены в `.agents/skills/` как тонкие обёртки со ссылкой на `.claude/skills/*/SKILL.md`.
- Субагенты `simplifier` и `code-reviewer` оформлены в `.agents/agents/` как тонкие обёртки над `.claude/agents/{simplifier,code-reviewer}.md` (в файлах Claude используются Claude-специфичные поля frontmatter `tools` и `model`). В шагах 6 и 8 `/next-task` вызывайте их через `invoke_subagent` с `TypeName: "simplifier"` / `"code-reviewer"`, передавая только поля входа из скила.
