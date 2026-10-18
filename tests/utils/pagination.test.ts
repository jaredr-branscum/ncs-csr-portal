import { describe, it, expect } from 'vitest';
import {
  calculateTotalPages,
  calculateItemRange,
  calculateSkipOffset,
} from '../../lib/utils/pagination';

describe('offset pagination utility helpers', () => {
  describe('calculateTotalPages', () => {
    it('returns 1 when totalCount is zero or negative', () => {
      expect(calculateTotalPages(0, 10)).toBe(1);
      expect(calculateTotalPages(-5, 10)).toBe(1);
    });

    it('returns 1 when pageSize is zero or negative', () => {
      expect(calculateTotalPages(25, 0)).toBe(1);
      expect(calculateTotalPages(25, -10)).toBe(1);
    });

    it('calculates total pages correctly for exact multiples and remainders', () => {
      expect(calculateTotalPages(5, 10)).toBe(1);
      expect(calculateTotalPages(10, 10)).toBe(1);
      expect(calculateTotalPages(11, 10)).toBe(2);
      expect(calculateTotalPages(25, 10)).toBe(3);
    });
  });

  describe('calculateItemRange', () => {
    it('returns zeros for invalid counts, pages, or page sizes', () => {
      expect(calculateItemRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
      expect(calculateItemRange(0, 10, 25)).toEqual({ start: 0, end: 0 });
      expect(calculateItemRange(-1, 10, 25)).toEqual({ start: 0, end: 0 });
      expect(calculateItemRange(1, 0, 25)).toEqual({ start: 0, end: 0 });
      expect(calculateItemRange(1, -5, 25)).toEqual({ start: 0, end: 0 });
    });

    it('calculates range for first, middle, and last page', () => {
      expect(calculateItemRange(1, 10, 25)).toEqual({ start: 1, end: 10 });
      expect(calculateItemRange(2, 10, 25)).toEqual({ start: 11, end: 20 });
      expect(calculateItemRange(3, 10, 25)).toEqual({ start: 21, end: 25 });
    });
  });

  describe('calculateSkipOffset', () => {
    it('returns 0 for page 1 or non-positive pages', () => {
      expect(calculateSkipOffset(1, 10)).toBe(0);
      expect(calculateSkipOffset(0, 10)).toBe(0);
      expect(calculateSkipOffset(-2, 10)).toBe(0);
    });

    it('returns 0 for non-positive pageSize', () => {
      expect(calculateSkipOffset(2, 0)).toBe(0);
      expect(calculateSkipOffset(2, -5)).toBe(0);
    });

    it('calculates skip offset correctly for subsequent pages', () => {
      expect(calculateSkipOffset(2, 10)).toBe(10);
      expect(calculateSkipOffset(3, 10)).toBe(20);
    });
  });
});
