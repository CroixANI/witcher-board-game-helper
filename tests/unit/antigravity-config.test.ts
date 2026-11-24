// Конфигурация Antigravity (AGENTS.md, .agents/skills/*/SKILL.md, .agents/agents/*.md):
// проверяем валидный YAML frontmatter, отсутствие Claude-специфичных полей и ссылки на .claude/.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '../..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  expect(match, 'ожидается YAML frontmatter').not.toBeNull();
  return { data: parse(match![1]!) as Record<string, unknown>, body: match![2]! };
}

describe('Antigravity customizations', () => {
  it('AGENTS.md подключает CLAUDE.md через include без frontmatter', () => {
    const content = read('AGENTS.md');
    expect(content.startsWith('---')).toBe(false);
    expect(content).toContain('@[CLAUDE.md](CLAUDE.md)');
    expect(existsSync(resolve(root, 'CLAUDE.md'))).toBe(true);
  });

  it.each(['next-task', 'pr-sweep'])(
    '.agents/skills/%s/SKILL.md ссылается на Claude-скил',
    (name) => {
      const claudePath = `.claude/skills/${name}/SKILL.md`;
      expect(existsSync(resolve(root, claudePath))).toBe(true);

      const { data, body } = parseFrontmatter(read(`.agents/skills/${name}/SKILL.md`));
      expect(data.name).toBe(name);
      expect(typeof data.description).toBe('string');
      expect((data.description as string).length).toBeGreaterThan(10);
      expect(body).toContain(claudePath);
    },
  );

  it.each(['simplifier', 'code-reviewer'])(
    '.agents/agents/%s.md — валидная обёртка со ссылкой на Claude-агент',
    (name) => {
      const claudePath = `.claude/agents/${name}.md`;
      expect(existsSync(resolve(root, claudePath))).toBe(true);

      const { data, body } = parseFrontmatter(read(`.agents/agents/${name}.md`));
      expect(data.name).toBe(name);
      expect(typeof data.description).toBe('string');
      expect(data.subagent).toBe(true);
      expect(data.mainAgent).toBe(false);
      expect(data.model).toBe('inherit');
      // Claude-специфичное поле `tools` не копируем: неизвестные имена могут вешать субагент Antigravity.
      expect(data.tools).toBeUndefined();
      expect(body).toContain(claudePath);
    },
  );
});
