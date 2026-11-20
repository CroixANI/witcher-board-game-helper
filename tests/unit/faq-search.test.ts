import { describe, expect, it } from 'vitest';
import {
  faqQueryString,
  faqTags,
  filterFaq,
  pagefindFilters,
  parseFaqQuery,
  type FaqItem,
} from '../../src/lib/faq-search';

const items: FaqItem[] = [
  { slug: 'a', phase: 'phase2', tags: ['трофеи', 'медитация'] },
  { slug: 'b', phase: 'battle', tags: ['трофеи'] },
  { slug: 'c', phase: 'battle', tags: ['ставки'] },
];
const tags = faqTags(items);

describe('parseFaqQuery', () => {
  it('читает q, phase и tag (в том числе закодированный кириллический)', () => {
    expect(
      parseFaqQuery('?q=+ряд+карт+&phase=battle&tag=%D1%82%D1%80%D0%BE%D1%84%D0%B5%D0%B8', tags),
    ).toEqual({
      q: 'ряд карт',
      phase: 'battle',
      tag: 'трофеи',
    });
  });

  it('пустая строка — без фильтров', () => {
    expect(parseFaqQuery('', tags)).toEqual({ q: '', phase: undefined, tag: undefined });
  });

  it('неизвестные фаза и тег отбрасываются', () => {
    expect(parseFaqQuery('?phase=phase9&tag=нет-такого', tags)).toEqual({
      q: '',
      phase: undefined,
      tag: undefined,
    });
  });
});

describe('faqQueryString', () => {
  it('пустое состояние — пустая строка', () => {
    expect(faqQueryString({ q: '  ', phase: undefined, tag: undefined })).toBe('');
  });

  it('туда и обратно через parseFaqQuery', () => {
    const query = { q: 'медитация', phase: 'phase2' as const, tag: 'трофеи' };
    expect(parseFaqQuery(faqQueryString(query), tags)).toEqual(query);
  });
});

describe('filterFaq', () => {
  it('без фильтров — все вопросы', () => {
    expect(filterFaq(items, { phase: undefined, tag: undefined })).toEqual(
      new Set(['a', 'b', 'c']),
    );
  });

  it('?phase=battle — только битва', () => {
    expect(filterFaq(items, { phase: 'battle', tag: undefined })).toEqual(new Set(['b', 'c']));
  });

  it('фаза и тег вместе — пересечение', () => {
    expect(filterFaq(items, { phase: 'battle', tag: 'трофеи' })).toEqual(new Set(['b']));
  });

  it('фаза без вопросов — пусто', () => {
    expect(filterFaq(items, { phase: 'setup', tag: undefined }).size).toBe(0);
  });
});

describe('pagefindFilters', () => {
  it('передаёт только заданные фильтры', () => {
    expect(pagefindFilters({ phase: undefined, tag: undefined })).toEqual({});
    expect(pagefindFilters({ phase: 'battle', tag: 'трофеи' })).toEqual({
      phase: 'battle',
      tag: 'трофеи',
    });
  });
});

describe('faqTags', () => {
  it('без повторов, по алфавиту', () => {
    expect(tags).toEqual(['медитация', 'ставки', 'трофеи']);
  });
});
