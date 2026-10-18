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

export {
  calculateTotalPages,
  calculateItemRange,
  calculateSkipOffset,
} from '@/lib/utils/pagination';
