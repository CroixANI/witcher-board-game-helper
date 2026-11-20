// Хелперы страниц FAQ (SPEC 10, ROADMAP R5.1).
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLLECTIONS } from '../../src/lib/content-schemas';
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
    expect(FAQ_PHASES.map((p) => p.id)).toEqual([
      'setup',
      'phase1',
      'phase2',
      'battle',
      'phase3',
      'general',
    ]);
    expect(faqPhaseLabel('battle')).toBe('Битва');
  });
});

describe('faqSourceLabel', () => {
  it('книга правил, офиц. FAQ (с пунктом и без), договорённость стола', () => {
    expect(faqSourceLabel({ source: 'rulebook' })).toBe('Книга правил');
    expect(
      faqSourceLabel({ source: 'official-faq', sourceRef: 'Офиц. FAQ, Базовая игра, п. 8' }),
    ).toBe('Офиц. FAQ, Базовая игра, п. 8');
    expect(faqSourceLabel({ source: 'official-faq' })).toBe('Официальный FAQ');
    expect(faqSourceLabel({ source: 'house' })).toBe('Договорённость стола');
  });
});

describe('_template.md', () => {
  it('лежит в src/content/faq и исключён из коллекции', () => {
    const dir = fileURLToPath(new URL('../../src/content/faq', import.meta.url));
    expect(readdirSync(dir)).toContain('_template.md');
    expect(COLLECTIONS.faq.exclude).toContain('_template.md');
  });
});
