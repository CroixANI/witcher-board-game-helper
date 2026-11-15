import { describe, expect, it } from 'vitest';
import { DEMO_WIZARD } from '../../src/data/demo-wizard';
import {
  buildWizardData,
  nodeRuleIds,
  refId,
  toSchoolViews,
  toViewNode,
  type ViewNode,
} from '../../src/lib/wizard-view';

const rule = (id: string, html?: string) => ({
  id,
  data: { title: `Правило ${id}`, page: 9, summary: 'Кратко', important: false },
  ...(html === undefined ? {} : { rendered: { html } }),
});
const component = (id: string) => ({
  id,
  data: { name: `Компонент ${id}`, icon: `${id}.svg`, howToTell: 'Так' },
});
const iconSvg = (file: string) => `<svg data-file="${file}"></svg>`;

describe('refId / toViewNode', () => {
  it('ссылка Astro и строка дают id', () => {
    expect(refId('hand-limit')).toBe('hand-limit');
    expect(refId({ id: 'hand-limit' })).toBe('hand-limit');
  });

  it('ссылки узла и пунктов чек-листа превращаются в строки, HTML подробностей добавляется', () => {
    const node = toViewNode(
      {
        id: 's',
        type: 'step',
        title: 'Шаг',
        phase: 'setup',
        pages: 6,
        next: 'e',
        rules: [{ id: 'r1' }],
        components: [{ id: 'c1' }],
        checklist: [{ text: 'a' }, { text: 'b', rule: { id: 'r2' } }],
      } as Parameters<typeof toViewNode>[0],
      '<p>Подробно</p>',
    );
    expect(node.rules).toEqual(['r1']);
    expect(node.components).toEqual(['c1']);
    expect(node.checklist).toEqual([{ text: 'a' }, { text: 'b', rule: 'r2' }]);
    expect(node.detailsHtml).toBe('<p>Подробно</p>');
  });

  it('без тела Markdown detailsHtml не появляется', () => {
    const node = toViewNode({ id: 'e', type: 'end' } as Parameters<typeof toViewNode>[0], '');
    expect(node).not.toHaveProperty('detailsHtml');
  });
});

describe('nodeRuleIds', () => {
  it('правила узла и пунктов чек-листа без дублей, по порядку', () => {
    const node = {
      rules: ['a', 'b'],
      checklist: [{ text: '1', rule: 'b' }, { text: '2', rule: 'c' }, { text: '3' }],
    } as unknown as ViewNode;
    expect(nodeRuleIds(node)).toEqual(['a', 'b', 'c']);
  });
});

describe('buildWizardData', () => {
  const rules = [rule('setup-action-row', '<p>ряд</p>'), rule('hand-limit'), rule('unused')];
  const components = [component('action-card'), component('gold')];

  it('берёт только упомянутые правила и компоненты, HTML и иконку', () => {
    const data = buildWizardData(DEMO_WIZARD, rules, components, iconSvg);
    expect(Object.keys(data.rules).sort()).toEqual(['hand-limit', 'setup-action-row']);
    expect(data.rules['setup-action-row']?.html).toBe('<p>ряд</p>');
    expect(data.rules['hand-limit']?.html).toBe('');
    expect(data.components).toEqual({
      'action-card': {
        id: 'action-card',
        name: 'Компонент action-card',
        iconSvg: '<svg data-file="action-card.svg"></svg>',
        howToTell: 'Так',
      },
    });
    expect(data.nodes).toBe(DEMO_WIZARD.nodes);
  });

  it('данные сериализуются в JSON без потерь (пропс острова)', () => {
    const data = buildWizardData(DEMO_WIZARD, rules, components, iconSvg);
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it('неизвестное правило или компонент — ошибка', () => {
    expect(() => buildWizardData(DEMO_WIZARD, [], components, iconSvg)).toThrow(
      /неизвестное правило setup-action-row/,
    );
    expect(() => buildWizardData(DEMO_WIZARD, rules, [], iconSvg)).toThrow(
      /неизвестный компонент action-card/,
    );
  });
});

describe('toSchoolViews', () => {
  const school = (id: string) => ({
    id,
    data: {
      name: `Школа ${id}`,
      specialization: 'Спец',
      timing: 'Когда',
      effect: 'Эффект',
      page: 34,
      color: '#123456',
      expansion: 'base',
    },
  });

  it('записи коллекции → словарь по id без лишних полей', () => {
    const views = toSchoolViews([school('wolf'), school('viper')]);
    expect(Object.keys(views)).toEqual(['wolf', 'viper']);
    expect(views.wolf).toEqual({
      id: 'wolf',
      name: 'Школа wolf',
      specialization: 'Спец',
      timing: 'Когда',
      effect: 'Эффект',
      page: 34,
      color: '#123456',
    });
  });

  it('неизвестная школа — ошибка сборки', () => {
    expect(() => toSchoolViews([school('manticore')])).toThrow(/неизвестная школа manticore/);
  });
});
