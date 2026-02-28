// packages/enforma/src/datasource/applyFilters.test.ts
import { describe, it, expect } from 'vitest';
import { applyFilters } from './applyFilters';

type Item = {
  code: string;
  name: string;
  age: number;
  country: string;
  active: boolean;
  score: number;
  createdAt: Date;
};

const items: Item[] = [
  {
    code: 'a',
    name: 'Alice',
    age: 30,
    country: 'us',
    active: true,
    score: 80,
    createdAt: new Date('2024-01-01'),
  },
  {
    code: 'b',
    name: 'Bob',
    age: 17,
    country: 'gb',
    active: false,
    score: 55,
    createdAt: new Date('2024-06-15'),
  },
  {
    code: 'c',
    name: 'Charlie',
    age: 45,
    country: 'us',
    active: true,
    score: 92,
    createdAt: new Date('2025-03-10'),
  },
];

describe('applyFilters — empty filters', () => {
  it('returns all items when filters is empty', () => {
    expect(applyFilters(items, {})).toEqual(items);
  });
});

describe('applyFilters — plain value equality', () => {
  it('filters by string equality', () => {
    expect(applyFilters(items, { country: 'us' })).toEqual([items[0], items[2]]);
  });

  it('filters by number equality', () => {
    expect(applyFilters(items, { age: 17 })).toEqual([items[1]]);
  });

  it('filters by boolean equality', () => {
    expect(applyFilters(items, { active: false })).toEqual([items[1]]);
  });

  it('returns empty array when no items match', () => {
    expect(applyFilters(items, { country: 'de' })).toEqual([]);
  });

  it('filters by Date equality using .getTime()', () => {
    expect(applyFilters(items, { createdAt: new Date('2024-01-01') })).toEqual([items[0]]);
  });

  it('does not match a Date against a different Date', () => {
    expect(applyFilters(items, { createdAt: new Date('2024-01-02') })).toEqual([]);
  });
});

describe('applyFilters — comparison operators (numbers)', () => {
  it('gt filters items with field > value', () => {
    expect(applyFilters(items, { age: { gt: 30 } })).toEqual([items[2]]);
  });

  it('gte filters items with field >= value', () => {
    expect(applyFilters(items, { age: { gte: 30 } })).toEqual([items[0], items[2]]);
  });

  it('lt filters items with field < value', () => {
    expect(applyFilters(items, { age: { lt: 30 } })).toEqual([items[1]]);
  });

  it('lte filters items with field <= value', () => {
    expect(applyFilters(items, { age: { lte: 30 } })).toEqual([items[0], items[1]]);
  });

  it('combines gt and lt for a range', () => {
    expect(applyFilters(items, { age: { gt: 17, lt: 45 } })).toEqual([items[0]]);
  });
});

describe('applyFilters — comparison operators (dates)', () => {
  it('gt filters items with date after value', () => {
    expect(applyFilters(items, { createdAt: { gt: new Date('2024-06-15') } })).toEqual([items[2]]);
  });

  it('gte filters items with date on or after value', () => {
    expect(applyFilters(items, { createdAt: { gte: new Date('2024-06-15') } })).toEqual([
      items[1],
      items[2],
    ]);
  });

  it('lt filters items with date before value', () => {
    expect(applyFilters(items, { createdAt: { lt: new Date('2024-06-15') } })).toEqual([items[0]]);
  });
});

describe('applyFilters — membership operators', () => {
  it('in filters items whose field value is in the list', () => {
    expect(applyFilters(items, { country: { in: ['us', 'de'] } })).toEqual([items[0], items[2]]);
  });

  it('notIn filters items whose field value is not in the list', () => {
    expect(applyFilters(items, { country: { notIn: ['us'] } })).toEqual([items[1]]);
  });

  it('in with empty array returns no items', () => {
    expect(applyFilters(items, { country: { in: [] } })).toEqual([]);
  });
});

describe('applyFilters — string operators (case-insensitive)', () => {
  it('contains matches substring case-insensitively', () => {
    expect(applyFilters(items, { name: { contains: 'li' } })).toEqual([items[0], items[2]]);
  });

  it('contains matches regardless of case in filter value', () => {
    expect(applyFilters(items, { name: { contains: 'ALICE' } })).toEqual([items[0]]);
  });

  it('contains matches regardless of case in item value', () => {
    const upperItems = [{ ...items[0], name: 'ALICE' }];
    expect(applyFilters(upperItems, { name: { contains: 'alice' } })).toEqual(upperItems);
  });

  it('startsWith matches prefix case-insensitively', () => {
    expect(applyFilters(items, { name: { startsWith: 'al' } })).toEqual([items[0]]);
  });

  it('endsWith matches suffix case-insensitively', () => {
    expect(applyFilters(items, { name: { endsWith: 'E' } })).toEqual([items[0], items[2]]);
  });
});

describe('applyFilters — multiple fields (implicit AND)', () => {
  it('applies all field filters together', () => {
    expect(applyFilters(items, { country: 'us', age: { gt: 30 } })).toEqual([items[2]]);
  });

  it('returns empty when one condition eliminates all items', () => {
    expect(applyFilters(items, { country: 'us', age: { gt: 100 } })).toEqual([]);
  });
});
