export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
}

export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Formats a Date instance, ISO string, or timestamp into standard 'MMM D, YYYY' format.
 * Supports configurable locale and timeZone for robust internationalization.
 */
export function formatDate(
  date: Date | string | number,
  options?: string | DateFormatOptions
): string {
  const parsed = date instanceof Date ? date : new Date(date);

  if (typeof options === 'string') {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: options,
    }).format(parsed);
  }

  const locale = options?.locale ?? DEFAULT_LOCALE;
  const timeZone = options?.timeZone ?? DEFAULT_TIMEZONE;

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(parsed);
}

/**
 * Calculates the next recurring monthly billing date.
 * Advances by one calendar month, preserving day-of-month and safely clamping
 * to the final day of shorter months (e.g., Jan 31 -> Feb 28/29, Aug 31 -> Sep 30).
 */
export function calculateNextBillingDate(fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDate();

  // Advance by 1 calendar month
  result.setMonth(result.getMonth() + 1);

  // If day changed (e.g. Feb 31 rolled into March 3), clamp back to last day of target month
  if (result.getDate() !== currentDay) {
    result.setDate(0);
  }

  return result;
}
