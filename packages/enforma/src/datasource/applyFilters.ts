// packages/enforma/src/datasource/applyFilters.ts
import type { FilterSpec, FilterValue, FilterPredicate } from './types';

function toComparable(value: number | string | Date): number | string {
  return value instanceof Date ? value.getTime() : value;
}

function matchesPredicate(itemValue: unknown, predicate: FilterPredicate): boolean {
  if (predicate.gt !== undefined) {
    if (toComparable(predicate.gt) >= toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.gte !== undefined) {
    if (toComparable(predicate.gte) > toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.lt !== undefined) {
    if (toComparable(predicate.lt) <= toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.lte !== undefined) {
    if (toComparable(predicate.lte) < toComparable(itemValue as number | string | Date)) return false;
  }
  if (predicate.in !== undefined) {
    if (!predicate.in.includes(itemValue)) return false;
  }
  if (predicate.notIn !== undefined) {
    if (predicate.notIn.includes(itemValue)) return false;
  }
  if (predicate.contains !== undefined) {
    if (!String(itemValue).toLowerCase().includes(predicate.contains.toLowerCase())) return false;
  }
  if (predicate.startsWith !== undefined) {
    if (!String(itemValue).toLowerCase().startsWith(predicate.startsWith.toLowerCase())) return false;
  }
  if (predicate.endsWith !== undefined) {
    if (!String(itemValue).toLowerCase().endsWith(predicate.endsWith.toLowerCase())) return false;
  }
  return true;
}

function matchesValue(itemValue: unknown, filterValue: FilterValue): boolean {
  if (filterValue instanceof Date) {
    return itemValue instanceof Date && itemValue.getTime() === filterValue.getTime();
  }
  if (filterValue !== null && typeof filterValue === 'object') {
    return matchesPredicate(itemValue, filterValue);
  }
  return itemValue === filterValue;
}

export function applyFilters<T>(items: T[], filters: FilterSpec): T[] {
  const entries = Object.entries(filters);
  if (entries.length === 0) return items;
  return items.filter((item) =>
    entries.every(([field, filterValue]) =>
      matchesValue((item as Record<string, unknown>)[field], filterValue),
    ),
  );
}
