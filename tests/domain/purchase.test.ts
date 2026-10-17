import { describe, it, expect } from 'vitest';
import { PurchaseStatus, PurchaseType } from '@prisma/client';
import {
  calculateLifetimeSpend,
  countCouponsRedeemed,
  isFreeCoupon,
  calculateTotalPages,
  calculateItemRange,
  calculateSkipOffset,
} from '../../lib/domain/purchase';

describe('purchase domain logic', () => {
  describe('calculateLifetimeSpend', () => {
    it('returns 0 for empty purchase list', () => {
      expect(calculateLifetimeSpend([])).toBe(0);
    });

    it('sums paid amounts correctly', () => {
      const purchases = [
        { amountCents: 3499, status: PurchaseStatus.PAID, type: PurchaseType.SUBSCRIPTION },
        { amountCents: 1800, status: PurchaseStatus.PAID, type: PurchaseType.SINGLE_WASH },
        { amountCents: 0, status: PurchaseStatus.PAID, type: PurchaseType.COUPON },
      ];
      expect(calculateLifetimeSpend(purchases)).toBe(5299);
    });

    it('excludes FAILED purchases from lifetime spend', () => {
      const purchases = [
        { amountCents: 3499, status: PurchaseStatus.FAILED, type: PurchaseType.SUBSCRIPTION },
        { amountCents: 2000, status: PurchaseStatus.PAID, type: PurchaseType.SINGLE_WASH },
      ];
      expect(calculateLifetimeSpend(purchases)).toBe(2000);
    });
  });

  describe('countCouponsRedeemed', () => {
    it('counts total coupons in purchase ledger', () => {
      const purchases = [
        { amountCents: 0, status: PurchaseStatus.PAID, type: PurchaseType.COUPON },
        { amountCents: 1800, status: PurchaseStatus.PAID, type: PurchaseType.SINGLE_WASH },
        { amountCents: 0, status: PurchaseStatus.PAID, type: PurchaseType.COUPON },
      ];
      expect(countCouponsRedeemed(purchases)).toBe(2);
    });

    it('returns 0 when no coupons exist', () => {
      const purchases = [
        { amountCents: 1800, status: PurchaseStatus.PAID, type: PurchaseType.SINGLE_WASH },
      ];
      expect(countCouponsRedeemed(purchases)).toBe(0);
    });
  });

  describe('isFreeCoupon', () => {
    it('returns true when amountCents is 0', () => {
      expect(isFreeCoupon(0, PurchaseType.SINGLE_WASH)).toBe(true);
    });

    it('returns true when type is COUPON', () => {
      expect(isFreeCoupon(500, PurchaseType.COUPON)).toBe(true);
    });

    it('returns false for paid standard purchases', () => {
      expect(isFreeCoupon(3499, PurchaseType.SUBSCRIPTION)).toBe(false);
    });
  });

  describe('calculateTotalPages', () => {
    it('returns 1 when totalCount is zero or negative', () => {
      expect(calculateTotalPages(0, 10)).toBe(1);
      expect(calculateTotalPages(-5, 10)).toBe(1);
    });

    it('returns 1 when pageSize is zero or negative', () => {
      expect(calculateTotalPages(25, 0)).toBe(1);
      expect(calculateTotalPages(25, -10)).toBe(1);
    });

    it('calculates total pages correctly', () => {
      expect(calculateTotalPages(10, 10)).toBe(1);
      expect(calculateTotalPages(11, 10)).toBe(2);
      expect(calculateTotalPages(25, 10)).toBe(3);
    });
  });

  describe('calculateItemRange', () => {
    it('returns zeros for invalid counts, pages, or page sizes', () => {
      expect(calculateItemRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
      expect(calculateItemRange(0, 10, 25)).toEqual({ start: 0, end: 0 });
      expect(calculateItemRange(1, 0, 25)).toEqual({ start: 0, end: 0 });
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

    it('returns 0 for invalid pageSize', () => {
      expect(calculateSkipOffset(2, 0)).toBe(0);
      expect(calculateSkipOffset(2, -5)).toBe(0);
    });

    it('calculates skip offset correctly for subsequent pages', () => {
      expect(calculateSkipOffset(2, 10)).toBe(10);
      expect(calculateSkipOffset(3, 10)).toBe(20);
    });
  });
});

