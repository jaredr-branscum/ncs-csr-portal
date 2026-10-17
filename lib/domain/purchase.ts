import { PurchaseStatus, PurchaseType, type Purchase } from '@prisma/client';

export type PurchaseSummaryItem = Pick<Purchase, 'amountCents' | 'status' | 'type'>;

/**
 * Calculates total lifetime amount spent across all successfully paid purchases.
 * Failed transactions and $0 promotional coupons do not inflate the total.
 */
export function calculateLifetimeSpend(purchases: PurchaseSummaryItem[]): number {
  return purchases
    .filter((p) => p.status === PurchaseStatus.PAID)
    .reduce((sum, p) => sum + p.amountCents, 0);
}

/**
 * Counts total promotional coupons or discounts redeemed by the customer.
 */
export function countCouponsRedeemed(purchases: PurchaseSummaryItem[]): number {
  return purchases.filter((p) => p.type === PurchaseType.COUPON).length;
}

/**
 * Checks whether a purchase represents a promotional $0 coupon.
 */
export function isFreeCoupon(amountCents: number, type: PurchaseType): boolean {
  return amountCents === 0 || type === PurchaseType.COUPON;
}

/**
 * Default number of purchase items displayed per page in the billing ledger.
 */
export const DEFAULT_PURCHASE_PAGE_SIZE = 10;

/**
 * Calculates total pages required for offset pagination.
 * Always returns at least 1.
 */
export function calculateTotalPages(totalCount: number, pageSize: number = DEFAULT_PURCHASE_PAGE_SIZE): number {
  if (totalCount <= 0 || pageSize <= 0) return 1;
  return Math.ceil(totalCount / pageSize);
}

/**
 * Calculates the 1-based start and end indices of displayed items for pagination display.
 */
export function calculateItemRange(page: number, pageSize: number, totalCount: number): { start: number; end: number } {
  if (totalCount <= 0 || page <= 0 || pageSize <= 0) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  return { start, end };
}

/**
 * Calculates the database query skip offset given a 1-indexed page number and page size.
 */
export function calculateSkipOffset(page: number, pageSize: number = DEFAULT_PURCHASE_PAGE_SIZE): number {
  if (page <= 1 || pageSize <= 0) return 0;
  return (page - 1) * pageSize;
}
