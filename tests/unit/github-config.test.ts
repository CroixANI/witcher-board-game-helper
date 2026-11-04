// Конфигурация .github/ (SPEC 12.7, 13.4, 14.1 шаг 5): CI, деплой, Issue Forms, Dependabot.
// Опечатка в workflow ломает защиту main (контекст `check`) или деплой молча — ловим её до push.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

type Step = { uses?: string; run?: string; with?: Record<string, unknown> };
type Job = { needs?: string | string[]; steps: Step[]; environment?: { name: string } };
type Workflow = {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<string, Job>;
};
type FormField = {
  type: string;
  id?: string;
  attributes: { label: string; options?: string[] };
  validations?: { required?: boolean };
};
type IssueForm = { name: string; description: string; labels: string[]; body: FormField[] };

const read = (path: string): string =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const load = <T>(path: string): T => parse(read(path)) as T;

const ci = load<Workflow>('.github/workflows/ci.yml');
const deploy = load<Workflow>('.github/workflows/deploy.yml');
const nodeMajor = read('.nvmrc').trim();
const usesOf = (wf: Workflow): string[] =>
  Object.values(wf.jobs).flatMap((job) => job.steps.flatMap((s) => (s.uses ? [s.uses] : [])));
const runsOf = (job: Job): string[] => job.steps.flatMap((s) => (s.run ? [s.run.trim()] : []));

describe('ci.yml', () => {
  it('запускается на PR и на push в main', () => {
    expect(ci.on).toHaveProperty('pull_request');
    expect(ci.on.push).toEqual({ branches: ['main'] });
  });

  it('job называется `check` — это контекст защиты main (R0.4)', () => {
    expect(Object.keys(ci.jobs)).toEqual(['check']);
  });

  it('гоняет весь DoD по порядку: npm ci → lint → check → test → build', () => {
    expect(runsOf(ci.jobs.check!)).toEqual([
      'npm ci',
      'npm run lint',
      'npm run check',
      'npm test',
      'npm run build',
    ]);
  });

  it('берёт Node из .nvmrc с кешем npm', () => {
    const setup = ci.jobs.check!.steps.find((s) => s.uses?.startsWith('actions/setup-node@'));
    expect(setup?.with).toEqual({ 'node-version-file': '.nvmrc', cache: 'npm' });
  });

  it('только чтение репозитория; старые прогоны ветки отменяются', () => {
    expect(ci.permissions).toEqual({ contents: 'read' });
    expect(ci.concurrency).toEqual({ group: 'ci-${{ github.ref }}', 'cancel-in-progress': true });
  });
});

describe('deploy.yml', () => {
  it('деплоит только из main (и вручную)', () => {
    expect(deploy.on.push).toEqual({ branches: ['main'] });
    expect(deploy.on).toHaveProperty('workflow_dispatch');
  });

  it('права Pages + OIDC, деплои не прерывают друг друга', () => {
    expect(deploy.permissions).toEqual({ contents: 'read', pages: 'write', 'id-token': 'write' });
    expect(deploy.concurrency).toEqual({ group: 'pages', 'cancel-in-progress': false });
  });

  it('build через withastro/action на той же версии Node, что и .nvmrc', () => {
    const astro = deploy.jobs.build!.steps.find((s) => s.uses?.startsWith('withastro/action@'));
    expect(String(astro?.with?.['node-version'])).toBe(nodeMajor);
  });

  it('deploy идёт после build в окружение github-pages', () => {
    const job = deploy.jobs.deploy!;
    expect(job.needs).toBe('build');
    expect(job.environment?.name).toBe('github-pages');
    expect(job.steps.some((s) => s.uses?.startsWith('actions/deploy-pages@'))).toBe(true);
  });
});

describe('actions', () => {
  it('каждый `uses` закреплён на мажорной версии', () => {
    for (const uses of [...usesOf(ci), ...usesOf(deploy)]) {
      expect(uses).toMatch(/^[\w.-]+\/[\w.-]+@v\d+$/);
    }
  });
});

describe('Issue Forms', () => {
  const dir = '.github/ISSUE_TEMPLATE';
  const forms = readdirSync(new URL(`../../${dir}`, import.meta.url))
    .filter((f) => f !== 'config.yml')
    .sort();

  it('пустые issues выключены, есть оба шаблона', () => {
    expect(load(`${dir}/config.yml`)).toEqual({ blank_issues_enabled: false });
    expect(forms).toEqual(['faq-question.yml', 'rules-bug.yml']);
  });

  it.each(forms)('%s: обязательные ключи формы и уникальные id полей', (file) => {
    const form = load<IssueForm>(`${dir}/${file}`);
    expect(form.name).toBeTruthy();
    expect(form.description).toBeTruthy();
    expect(form.body.length).toBeGreaterThan(0);
    const ids = form.body.map((f) => f.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    for (const field of form.body) expect(field.attributes.label).toBeTruthy();
  });

  it('FAQ: label faq, вопрос и фаза обязательны', () => {
    const form = load<IssueForm>(`${dir}/faq-question.yml`);
    expect(form.labels).toEqual(['faq']);
    const required = form.body.filter((f) => f.validations?.required).map((f) => f.id);
    expect(required).toEqual(['question', 'phase']);
  });

  it('Ошибка в правилах: label rules, страница обязательна, игроков 2–5 (D3)', () => {
    const form = load<IssueForm>(`${dir}/rules-bug.yml`);
    expect(form.labels).toEqual(['rules']);
    const page = form.body.find((f) => f.id === 'page');
    expect(page?.validations?.required).toBe(true);
    const players = form.body.find((f) => f.id === 'players');
    expect(players?.type).toBe('dropdown');
    expect(players?.attributes.options).toEqual(['2', '3', '4', '5']);
  });
});

describe('dependabot.yml', () => {
  type Update = { 'package-ecosystem': string; labels: string[]; groups?: Record<string, unknown> };
  const cfg = load<{ version: number; updates: Update[] }>('.github/dependabot.yml');

  it('npm (с группами) и github-actions, label infra', () => {
    expect(cfg.version).toBe(2);
    expect(cfg.updates.map((u) => u['package-ecosystem'])).toEqual(['npm', 'github-actions']);
    expect(Object.keys(cfg.updates[0]!.groups ?? {})).toEqual(['astro', 'lint', 'test']);
    for (const u of cfg.updates) expect(u.labels).toEqual(['infra']);
  });
});
