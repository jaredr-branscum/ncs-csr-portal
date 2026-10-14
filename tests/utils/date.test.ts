import { describe, it, expect } from 'vitest';
import { formatDate, calculateNextBillingDate } from '../../lib/utils/date';

describe('formatDate', () => {
  it('formats Date instance correctly with default settings', () => {
    const d = new Date('2026-10-12T12:00:00Z');
    expect(formatDate(d)).toBe('Oct 12, 2026');
  });

  it('formats ISO string correctly with default settings', () => {
    expect(formatDate('2026-05-15T00:00:00Z')).toBe('May 15, 2026');
  });

  it('formats numeric timestamp correctly with default settings', () => {
    const timestamp = new Date('2026-01-01T00:00:00Z').getTime();
    expect(formatDate(timestamp)).toBe('Jan 1, 2026');
  });

  it('allows specifying custom timeZone as string shorthand', () => {
    expect(formatDate('2026-01-01T02:00:00Z', 'America/New_York')).toBe('Dec 31, 2025');
  });

  it('supports custom i18n locale and timezone in options object', () => {
    const result = formatDate('2026-10-12T12:00:00Z', { locale: 'fr-FR', timeZone: 'UTC' });
    expect(result.toLowerCase()).toContain('oct');
  });
});

describe('calculateNextBillingDate', () => {
  it('advances a standard mid-month date by one calendar month', () => {
    const from = new Date(2026, 9, 14, 12, 0, 0); // Oct 14, 2026
    const next = calculateNextBillingDate(from);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(10); // Nov
    expect(next.getDate()).toBe(14);
  });

  it('safely clamps 31st to 30th when moving into a 30-day month', () => {
    const from = new Date(2026, 7, 31, 12, 0, 0); // Aug 31, 2026
    const next = calculateNextBillingDate(from);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(8); // Sep
    expect(next.getDate()).toBe(30);
  });

  it('safely clamps Jan 31 to Feb 28 in a non-leap year', () => {
    const from = new Date(2026, 0, 31, 12, 0, 0); // Jan 31, 2026
    const next = calculateNextBillingDate(from);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1); // Feb
    expect(next.getDate()).toBe(28);
  });

  it('safely clamps Jan 31 to Feb 29 in a leap year', () => {
    const from = new Date(2024, 0, 31, 12, 0, 0); // Jan 31, 2024
    const next = calculateNextBillingDate(from);
    expect(next.getFullYear()).toBe(2024);
    expect(next.getMonth()).toBe(1); // Feb
    expect(next.getDate()).toBe(29);
  });

  it('correctly increments the year when rolling over December into January', () => {
    const from = new Date(2026, 11, 15, 12, 0, 0); // Dec 15, 2026
    const next = calculateNextBillingDate(from);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0); // Jan
    expect(next.getDate()).toBe(15);
  });

  it('defaults to advancing from current time when called without arguments', () => {
    const before = new Date();
    const next = calculateNextBillingDate();
    expect(next.getTime()).toBeGreaterThan(before.getTime());
  });
});
