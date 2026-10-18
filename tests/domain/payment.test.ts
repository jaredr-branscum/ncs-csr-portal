import { describe, it, expect } from 'vitest';
import { UserStatus, SubscriptionStatus } from '@prisma/client';
import {
  evaluateOverdueResolutionEligibility,
  canResolveOverduePayment,
  calculateOverdueSettlement,
  formatSettlementDescription,
  resolveOverdueSubscription,
  resolveCustomerOverdueStatus,
  validateResolveOverduePayment,
  OVERDUE_RESOLUTION_REJECTION_MESSAGES,
  OVERDUE_SETTLEMENT_DESCRIPTIONS,
  OVERDUE_INVARIANT_ERRORS,
  type OverdueResolutionRejectionReason,
} from '../../lib/domain/payment';

describe('payment domain logic', () => {
  describe('OVERDUE_RESOLUTION_REJECTION_MESSAGES dictionary', () => {
    it('exhaustively defines non-empty string messages for all rejection reasons', () => {
      const reasons: OverdueResolutionRejectionReason[] = [
        'ACCOUNT_INACTIVE',
        'NO_OVERDUE_BALANCE',
      ];
      for (const reason of reasons) {
        expect(typeof OVERDUE_RESOLUTION_REJECTION_MESSAGES[reason]).toBe('string');
        expect(OVERDUE_RESOLUTION_REJECTION_MESSAGES[reason].length).toBeGreaterThan(0);
      }
    });
  });

  describe('OVERDUE_INVARIANT_ERRORS dictionary', () => {
    it('formats invariant error messages for invalid transitions', () => {
      const subError = OVERDUE_INVARIANT_ERRORS.SUBSCRIPTION_NOT_OVERDUE(SubscriptionStatus.ACTIVE);
      expect(typeof subError).toBe('string');
      expect(subError).toContain('ACTIVE');

      const userError = OVERDUE_INVARIANT_ERRORS.CUSTOMER_NOT_OVERDUE(UserStatus.ACTIVE);
      expect(typeof userError).toBe('string');
      expect(userError).toContain('ACTIVE');
    });
  });

  describe('evaluateOverdueResolutionEligibility', () => {
    it('returns eligible when customer status is OVERDUE', () => {
      const result = evaluateOverdueResolutionEligibility({
        status: UserStatus.OVERDUE,
        subscriptions: [{ status: SubscriptionStatus.OVERDUE }],
      });
      expect(result.eligible).toBe(true);
      if (result.eligible) {
        expect(result.overdueSubscriptionCount).toBe(1);
      }
    });

    it('returns eligible when customer has an overdue subscription even if user status is ACTIVE', () => {
      const result = evaluateOverdueResolutionEligibility({
        status: UserStatus.ACTIVE,
        subscriptions: [{ status: SubscriptionStatus.OVERDUE }],
      });
      expect(result.eligible).toBe(true);
      if (result.eligible) {
        expect(result.overdueSubscriptionCount).toBe(1);
      }
    });

    it('handles multiple overdue subscriptions and counts them accurately', () => {
      const result = evaluateOverdueResolutionEligibility({
        status: UserStatus.OVERDUE,
        subscriptions: [
          { status: SubscriptionStatus.OVERDUE },
          { status: SubscriptionStatus.ACTIVE },
          { status: SubscriptionStatus.OVERDUE },
        ],
      });
      expect(result.eligible).toBe(true);
      if (result.eligible) {
        expect(result.overdueSubscriptionCount).toBe(2);
      }
    });

    it('handles undefined subscriptions gracefully when customer status is OVERDUE', () => {
      const result = evaluateOverdueResolutionEligibility({
        status: UserStatus.OVERDUE,
      });
      expect(result.eligible).toBe(true);
      if (result.eligible) {
        expect(result.overdueSubscriptionCount).toBe(0);
      }
    });

    it('rejects with ACCOUNT_INACTIVE when customer is inactive', () => {
      const result = evaluateOverdueResolutionEligibility({
        status: UserStatus.INACTIVE,
        subscriptions: [{ status: SubscriptionStatus.OVERDUE }],
      });
      expect(result).toEqual({ eligible: false, reason: 'ACCOUNT_INACTIVE' });
      expect('message' in result).toBe(false);
    });

    it('rejects with NO_OVERDUE_BALANCE when customer and all subscriptions are in good standing', () => {
      const result = evaluateOverdueResolutionEligibility({
        status: UserStatus.ACTIVE,
        subscriptions: [
          { status: SubscriptionStatus.ACTIVE },
          { status: SubscriptionStatus.CANCELLED },
        ],
      });
      expect(result).toEqual({ eligible: false, reason: 'NO_OVERDUE_BALANCE' });
      expect('message' in result).toBe(false);
    });
  });

  describe('canResolveOverduePayment', () => {
    it('returns true when customer is eligible for overdue resolution', () => {
      expect(canResolveOverduePayment({ status: UserStatus.OVERDUE })).toBe(true);
    });

    it('returns false when customer is not overdue', () => {
      expect(canResolveOverduePayment({ status: UserStatus.ACTIVE, subscriptions: [] })).toBe(false);
    });
  });

  describe('calculateOverdueSettlement', () => {
    it('calculates settlement amounts for a single overdue subscription', () => {
      const result = calculateOverdueSettlement([
        {
          id: 'sub-1',
          plan: { name: 'Plan Alpha', priceCents: 1500 },
        },
      ]);

      expect(result).toEqual({
        totalAmountCents: 1500,
        subscriptionCount: 1,
        subscriptionIds: ['sub-1'],
      });
    });

    it('calculates settlement for multiple overdue subscriptions', () => {
      const result = calculateOverdueSettlement([
        { id: 'sub-1', plan: { name: 'Plan Alpha', priceCents: 1500 } },
        { id: 'sub-2', plan: { name: 'Plan Beta', priceCents: 2000 } },
      ]);

      expect(result).toEqual({
        totalAmountCents: 3500,
        subscriptionCount: 2,
        subscriptionIds: ['sub-1', 'sub-2'],
      });
    });

    it('handles empty subscriptions returning 0 cents and empty array', () => {
      const result = calculateOverdueSettlement([]);
      expect(result).toEqual({
        totalAmountCents: 0,
        subscriptionCount: 0,
        subscriptionIds: [],
      });
    });
  });

  describe('formatSettlementDescription', () => {
    it('formats single subscription description with plan name', () => {
      const desc = formatSettlementDescription([
        { id: 'sub-1', plan: { name: 'Plan Alpha', priceCents: 1500 } },
      ]);
      expect(desc).toBe(OVERDUE_SETTLEMENT_DESCRIPTIONS.SINGLE('Plan Alpha'));
    });

    it('formats multi-subscription description with specific plan names', () => {
      const desc = formatSettlementDescription([
        { id: 'sub-1', plan: { name: 'Plan Alpha', priceCents: 1500 } },
        { id: 'sub-2', plan: { name: 'Plan Beta', priceCents: 2000 } },
      ]);
      expect(desc).toBe(OVERDUE_SETTLEMENT_DESCRIPTIONS.MULTI(['Plan Alpha', 'Plan Beta']));
      expect(desc).toBe('Plan Alpha, Plan Beta — Overdue Payment Resolution');
    });

    it('formats fallback description for empty subscriptions', () => {
      const desc = formatSettlementDescription([]);
      expect(desc).toBe(OVERDUE_SETTLEMENT_DESCRIPTIONS.ACCOUNT_BALANCE);
    });

    it('supports custom translation dictionary for internationalization', () => {
      const customDescriptions = {
        SINGLE: (name: string) => `Plan: ${name}`,
        MULTI: (names: readonly string[]) => `Plans: ${names.join(' & ')}`,
        ACCOUNT_BALANCE: 'Balance',
      };
      const desc = formatSettlementDescription(
        [
          { id: 'sub-1', plan: { name: 'Plan Alpha', priceCents: 1500 } },
          { id: 'sub-2', plan: { name: 'Plan Beta', priceCents: 2000 } },
        ],
        customDescriptions
      );
      expect(desc).toBe('Plans: Plan Alpha & Plan Beta');
    });
  });

  describe('resolveOverdueSubscription', () => {
    const nextDate = new Date('2026-11-14T00:00:00Z');

    it('transitions an OVERDUE subscription to ACTIVE with new billing date', () => {
      const initial = {
        id: 'sub-1',
        status: SubscriptionStatus.OVERDUE,
        vehicleId: 'veh-1',
      };

      const resolved = resolveOverdueSubscription(initial, nextDate);
      expect(resolved.status).toBe(SubscriptionStatus.ACTIVE);
      expect(resolved.nextBillingAt).toEqual(nextDate);
      expect(resolved.id).toBe('sub-1');
      expect(resolved.vehicleId).toBe('veh-1');
    });

    it('throws using OVERDUE_INVARIANT_ERRORS when trying to resolve a non-overdue subscription', () => {
      expect(() =>
        resolveOverdueSubscription({ id: 'sub-1', status: SubscriptionStatus.ACTIVE }, nextDate)
      ).toThrow(OVERDUE_INVARIANT_ERRORS.SUBSCRIPTION_NOT_OVERDUE(SubscriptionStatus.ACTIVE));

      expect(() =>
        resolveOverdueSubscription({ id: 'sub-1', status: SubscriptionStatus.CANCELLED }, nextDate)
      ).toThrow(OVERDUE_INVARIANT_ERRORS.SUBSCRIPTION_NOT_OVERDUE(SubscriptionStatus.CANCELLED));
    });
  });

  describe('resolveCustomerOverdueStatus', () => {
    it('transitions an OVERDUE customer to ACTIVE', () => {
      const initial = {
        id: 'user-1',
        name: 'User One',
        status: UserStatus.OVERDUE,
      };

      const resolved = resolveCustomerOverdueStatus(initial);
      expect(resolved.status).toBe(UserStatus.ACTIVE);
      expect(resolved.id).toBe('user-1');
      expect(resolved.name).toBe('User One');
    });

    it('throws using OVERDUE_INVARIANT_ERRORS when trying to resolve a non-overdue customer', () => {
      expect(() =>
        resolveCustomerOverdueStatus({ id: 'user-1', status: UserStatus.ACTIVE })
      ).toThrow(OVERDUE_INVARIANT_ERRORS.CUSTOMER_NOT_OVERDUE(UserStatus.ACTIVE));

      expect(() =>
        resolveCustomerOverdueStatus({ id: 'user-1', status: UserStatus.INACTIVE })
      ).toThrow(OVERDUE_INVARIANT_ERRORS.CUSTOMER_NOT_OVERDUE(UserStatus.INACTIVE));
    });
  });

  describe('validateResolveOverduePayment', () => {
    it('validates and trims valid userId input', () => {
      const result = validateResolveOverduePayment({ userId: '  user-123  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('user-123');
      }
    });

    it('validates valid input with optional subscriptionIds array', () => {
      const result = validateResolveOverduePayment({
        userId: 'user-123',
        subscriptionIds: ['sub-1', '  sub-2  '],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subscriptionIds).toEqual(['sub-1', 'sub-2']);
      }
    });

    it('fails when subscriptionIds contains an empty string', () => {
      const result = validateResolveOverduePayment({
        userId: 'user-123',
        subscriptionIds: ['sub-1', '   '],
      });
      expect(result.success).toBe(false);
    });

    it('fails when userId is missing or blank', () => {
      const result = validateResolveOverduePayment({ userId: '   ' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.userId).toContain('User ID is required');
      }
    });

    it('handles non-object input gracefully', () => {
      const result = validateResolveOverduePayment(null);
      expect(result.success).toBe(false);
    });
  });
});
