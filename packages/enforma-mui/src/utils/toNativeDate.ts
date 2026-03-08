/**
 * Convert a date-adapter value (Dayjs, Luxon DateTime, Moment, or Date) to a
 * native JS Date.  Returns null when the input is null/undefined.
 */
export function toNativeDate(date: unknown): Date | null {
  if (date === null || date === undefined) return null;
  if (date instanceof Date) return date;
  // dayjs / moment: .toDate()
  if (typeof (date as { toDate?: unknown }).toDate === 'function') {
    return (date as { toDate: () => Date }).toDate();
  }
  // luxon DateTime: .toJSDate()
  if (typeof (date as { toJSDate?: unknown }).toJSDate === 'function') {
    return (date as { toJSDate: () => Date }).toJSDate();
  }
  return null;
}
