// Хелперы страниц FAQ (SPEC 10, ROADMAP R5.1).
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLLECTIONS, Phase } from '../../src/lib/content-schemas';
import {
  FAQ_PHASES,
  faqPhaseLabel,
  faqSourceLabel,
  groupFaq,
  type FaqPhase,
} from '../../src/lib/faq';

const entry = (id: string, phase: FaqPhase, question = `Вопрос ${id}?`) => ({
  id,
  data: { phase, question },
});

describe('groupFaq', () => {
  it('группы в порядке хода, пустые фазы пропущены, внутри — по алфавиту', () => {
    const groups = groupFaq([
      entry('g', 'general', 'Яблоко?'),
      entry('b2', 'battle', 'Что считается атакой?'),
      entry('p2', 'phase2'),
      entry('b1', 'battle', 'Атака монстра?'),
    ]);
    expect(groups.map((g) => g.id)).toEqual(['phase2', 'battle', 'general']);
    expect(groups[1]!.entries.map((e) => e.id)).toEqual(['b1', 'b2']);
  });

  it('пустой список — нет групп', () => {
    expect(groupFaq([])).toEqual([]);
  });

  it('у каждой фазы схемы есть группа', () => {
    expect(FAQ_PHASES.map((p) => p.id).toSorted()).toEqual(Phase.options.toSorted());
    expect(faqPhaseLabel('battle')).toBe('Битва');
  });
});

describe('faqSourceLabel', () => {
  const REF = 'Офиц. FAQ, Базовая игра, п. 11';

  it('книга правил: со страницей и без', () => {
    expect(faqSourceLabel({ source: 'rulebook', page: 15 })).toBe('Книга правил, стр. 15');
    expect(faqSourceLabel({ source: 'rulebook' })).toBe('Книга правил');
  });

  it('книга правил + sourceRef: пункт офиц. FAQ не теряется', () => {
    expect(faqSourceLabel({ source: 'rulebook', page: 18, sourceRef: REF })).toBe(
      `Книга правил, стр. 18 · ${REF}`,
    );
  });

  it('офиц. FAQ: страница — книги правил, а не FAQ', () => {
    expect(faqSourceLabel({ source: 'official-faq', sourceRef: REF, page: 22 })).toBe(
      `${REF} · Книга правил, стр. 22`,
    );
    expect(faqSourceLabel({ source: 'official-faq', sourceRef: REF })).toBe(REF);
    expect(faqSourceLabel({ source: 'official-faq' })).toBe('Официальный FAQ');
  });

  it('договорённость стола: со страницей книги и без', () => {
    expect(faqSourceLabel({ source: 'house' })).toBe('Договорённость стола');
    expect(faqSourceLabel({ source: 'house', page: 9 })).toBe(
      'Договорённость стола · Книга правил, стр. 9',
    );
  });
});

describe('_template.md', () => {
  it('лежит в src/content/faq и исключён из коллекции', () => {
    const dir = fileURLToPath(new URL('../../src/content/faq', import.meta.url));
    expect(readdirSync(dir)).toContain('_template.md');
    expect(COLLECTIONS.faq.exclude).toContain('_template.md');
  });
});
