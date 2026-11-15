import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { graphRoots, setupGraph, turnGraph, type TurnEntry } from '../../src/lib/load-graph';
import {
  advance,
  choose,
  initState,
  visibleOptions,
  type Graph,
} from '../../src/lib/wizard-engine';
import type { WizardNode } from '../../src/lib/wizard-engine';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));

/** Узлы подготовки из реальных файлов (frontmatter). Схему проверяет content.test.ts. */
function realSetup(): { order: number; node: WizardNode }[] {
  const dir = root('src/content/setup');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(`${dir}/${f}`, 'utf8');
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
      return parseYaml(fm) as { order: number; node: WizardNode };
    });
}

const info = (id: string, next: string): WizardNode => ({ id, type: 'info', next });
const end = (id: string): WizardNode => ({ id, type: 'end' });

describe('setupGraph', () => {
  it('entry — узел с наименьшим order, независимо от порядка файлов', () => {
    const g = setupGraph([
      { order: 2, node: end('b') },
      { order: 1, node: info('a', 'b') },
    ]);
    expect(g.entry).toBe('a');
    expect([...g.nodes.keys()]).toEqual(['a', 'b']);
  });

  it('пустая коллекция — ошибка', () => {
    expect(() => setupGraph([])).toThrow(/setup/);
  });
});

describe('turnGraph', () => {
  const sub = (subgraph: TurnEntry['subgraph'], entry: string, nodes: WizardNode[]) => ({
    subgraph,
    entry,
    nodes,
  });

  it('entry — точка входа подграфа start, узлы всех подграфов в одном графе', () => {
    const g = turnGraph([
      sub('phase3', 'p3', [info('p3', 'end'), end('end')]),
      sub('start', 't-start', [info('t-start', 'p3')]),
    ]);
    expect(g.entry).toBe('t-start');
    expect(g.nodes.size).toBe(3);
  });

  it('без подграфа start — ошибка', () => {
    expect(() => turnGraph([sub('phase3', 'p3', [end('p3')])])).toThrow(/start/);
  });

  it('дубли id между подграфами — ошибка', () => {
    expect(() =>
      turnGraph([sub('start', 'a', [info('a', 'b'), end('b')]), sub('phase3', 'b', [end('b')])]),
    ).toThrow(/дублирующийся id b/);
  });
});

describe('graphRoots', () => {
  it('setup — узел с наименьшим order', () => {
    expect(
      graphRoots('setup', [
        { order: 5, node: { id: 'x' } },
        { order: 3, node: { id: 'y' } },
      ]),
    ).toEqual(['y']);
    expect(graphRoots('setup', [])).toEqual([]);
  });

  it('turn — entry подграфа start, а пока его нет — entry всех подграфов', () => {
    expect(
      graphRoots('turn', [
        { subgraph: 'phase3', entry: 'p3' },
        { subgraph: 'start', entry: 't' },
      ]),
    ).toEqual(['t']);
    expect(
      graphRoots('turn', [
        { subgraph: 'phase3', entry: 'p3' },
        { subgraph: 'phase1', entry: 'p1' },
      ]),
    ).toEqual(['p3', 'p1']);
  });
});

describe('реальный граф подготовки проходится движком до end', () => {
  const g: Graph = setupGraph(realSetup());

  it.each([2, 3, 4, 5] as const)('%i игрока', (players) => {
    let s = initState(g, 'setup', { players });
    const seen = new Set<string>();
    while (g.nodes.get(s.current)?.type !== 'end') {
      expect(seen.has(s.current), `цикл на ${s.current}`).toBe(false);
      seen.add(s.current);
      const node = g.nodes.get(s.current)!;
      s =
        node.type === 'step' || node.type === 'info'
          ? advance(g, s)
          : choose(g, s, visibleOptions(node, s).length - 1);
    }
    expect(g.nodes.get(s.current)?.type).toBe('end');
  });
});
