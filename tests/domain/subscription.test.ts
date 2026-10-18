import { describe, it, expect } from 'vitest';
import { SubscriptionStatus } from '@prisma/client';
import {
  isSlotOccupied,
  getActiveSubscription,
  isVehicleVacant,
  canCancelSubscription,
  cancelSubscription,
  validateCancelSubscription,
  canAttachSubscription,
  attachSubscription,
  validateSubscribeVehicle,
  evaluateTransferEligibility,
  canTransferSubscription,
  transferSubscription,
  validateTransferSubscription,
  TRANSFER_REJECTION_MESSAGES,
  SUBSCRIPTION_INVARIANT_ERRORS,
  type TransferRejectionReason,
} from '../../lib/domain/subscription';

describe('subscription slot invariants', () => {
  describe('isSlotOccupied', () => {
    it('treats ACTIVE as occupied', () => {
      expect(isSlotOccupied(SubscriptionStatus.ACTIVE)).toBe(true);
    });

    it('treats OVERDUE as occupied', () => {
      expect(isSlotOccupied(SubscriptionStatus.OVERDUE)).toBe(true);
    });

    it('treats CANCELLED as vacant', () => {
      expect(isSlotOccupied(SubscriptionStatus.CANCELLED)).toBe(false);
    });
  });

  describe('getActiveSubscription', () => {
    it('returns undefined when subscriptions array is empty', () => {
      expect(getActiveSubscription([])).toBeUndefined();
    });

    it('returns the ACTIVE subscription when present', () => {
      const active = { id: '1', status: SubscriptionStatus.ACTIVE };
      const cancelled = { id: '2', status: SubscriptionStatus.CANCELLED };
      expect(getActiveSubscription([cancelled, active])).toBe(active);
    });

    it('returns the OVERDUE subscription when present', () => {
      const overdue = { id: '1', status: SubscriptionStatus.OVERDUE };
      expect(getActiveSubscription([overdue])).toBe(overdue);
    });

    it('returns undefined when only CANCELLED subscriptions exist', () => {
      const cancelled = { id: '1', status: SubscriptionStatus.CANCELLED };
      expect(getActiveSubscription([cancelled])).toBeUndefined();
    });
  });

  describe('isVehicleVacant', () => {
    it('returns true when vehicle has no subscriptions', () => {
      expect(isVehicleVacant([])).toBe(true);
    });

    it('returns true when vehicle only has CANCELLED subscriptions', () => {
      expect(isVehicleVacant([{ status: SubscriptionStatus.CANCELLED }])).toBe(true);
    });

    it('returns false when vehicle has an ACTIVE subscription', () => {
      expect(isVehicleVacant([{ status: SubscriptionStatus.ACTIVE }])).toBe(false);
    });

    it('returns false when vehicle has an OVERDUE subscription', () => {
      expect(isVehicleVacant([{ status: SubscriptionStatus.OVERDUE }])).toBe(false);
    });
  });

  describe('canCancelSubscription', () => {
    it('returns true for ACTIVE subscriptions', () => {
      expect(canCancelSubscription(SubscriptionStatus.ACTIVE)).toBe(true);
    });

    it('returns true for OVERDUE subscriptions', () => {
      expect(canCancelSubscription(SubscriptionStatus.OVERDUE)).toBe(true);
    });

    it('returns false for CANCELLED subscriptions', () => {
      expect(canCancelSubscription(SubscriptionStatus.CANCELLED)).toBe(false);
    });
  });

  describe('cancelSubscription pure transition', () => {
    it('flips ACTIVE status to CANCELLED', () => {
      const activeSub = { id: 'sub-1', status: SubscriptionStatus.ACTIVE, planId: 'plan-1' };
      const result = cancelSubscription(activeSub);
      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(result.id).toBe('sub-1');
    });

    it('flips OVERDUE status to CANCELLED', () => {
      const overdueSub = { id: 'sub-2', status: SubscriptionStatus.OVERDUE, planId: 'plan-1' };
      const result = cancelSubscription(overdueSub);
      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
    });

    it('throws error when attempting to cancel an already CANCELLED subscription', () => {
      const cancelledSub = { id: 'sub-3', status: SubscriptionStatus.CANCELLED };
      expect(() => cancelSubscription(cancelledSub)).toThrow(
        SUBSCRIPTION_INVARIANT_ERRORS.CANNOT_CANCEL_STATUS(SubscriptionStatus.CANCELLED)
      );
    });
  });

  describe('validateCancelSubscription', () => {
    it('validates a correct cancellation request with reason', () => {
      const result = validateCancelSubscription({
        subscriptionId: 'sub-123',
        reason: 'Customer requested cancellation via call.',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subscriptionId).toBe('sub-123');
        expect(result.data.reason).toBe('Customer requested cancellation via call.');
      }
    });

    it('validates a correct cancellation request without reason', () => {
      const result = validateCancelSubscription({
        subscriptionId: 'sub-123',
      });

      expect(result.success).toBe(true);
    });

    it('fails when subscriptionId is missing or empty', () => {
      const result = validateCancelSubscription({
        subscriptionId: '   ',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.subscriptionId).toContain('Subscription ID is required');
      }
    });

    it('fails when reason exceeds 200 characters', () => {
      const result = validateCancelSubscription({
        subscriptionId: 'sub-123',
        reason: 'A'.repeat(201),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.reason).toContain('cannot exceed 200 characters');
      }
    });

    it('handles non-object input gracefully', () => {
      const result = validateCancelSubscription(null);
      expect(result.success).toBe(false);
    });
  });

  describe('canAttachSubscription (Vehicle Exclusivity)', () => {
    it('returns true when vehicle has no subscriptions', () => {
      expect(canAttachSubscription([])).toBe(true);
    });

    it('returns true when vehicle only has CANCELLED subscriptions', () => {
      expect(canAttachSubscription([{ status: SubscriptionStatus.CANCELLED }])).toBe(true);
    });

    it('returns false when vehicle has an ACTIVE subscription', () => {
      expect(canAttachSubscription([{ status: SubscriptionStatus.ACTIVE }])).toBe(false);
    });

    it('returns false when vehicle has an OVERDUE subscription', () => {
      expect(canAttachSubscription([{ status: SubscriptionStatus.OVERDUE }])).toBe(false);
    });
  });

  describe('attachSubscription pure transition', () => {
    const newSub = { id: 'new-sub', status: SubscriptionStatus.ACTIVE, planId: 'plan-premium' };

    it('attaches a new subscription to an unsubscribed vehicle', () => {
      const result = attachSubscription([], newSub);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('new-sub');
      expect(result[0].status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('attaches a new subscription to a vehicle that only has CANCELLED passes', () => {
      const oldSub = { id: 'old-sub', status: SubscriptionStatus.CANCELLED, planId: 'plan-basic' };
      const result = attachSubscription([oldSub], newSub);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('new-sub');
      expect(result[1].id).toBe('old-sub');
    });

    it('throws error when vehicle already has an ACTIVE subscription', () => {
      const activeSub = { id: 'active-sub', status: SubscriptionStatus.ACTIVE, planId: 'plan-basic' };
      expect(() => attachSubscription([activeSub], newSub)).toThrow(
        SUBSCRIPTION_INVARIANT_ERRORS.ALREADY_HAS_ACTIVE
      );
    });

    it('throws error when vehicle already has an OVERDUE subscription', () => {
      const overdueSub = { id: 'overdue-sub', status: SubscriptionStatus.OVERDUE, planId: 'plan-basic' };
      expect(() => attachSubscription([overdueSub], newSub)).toThrow(
        SUBSCRIPTION_INVARIANT_ERRORS.ALREADY_HAS_ACTIVE
      );
    });
  });

  describe('validateSubscribeVehicle', () => {
    it('validates a valid subscribe vehicle input', () => {
      const result = validateSubscribeVehicle({
        vehicleId: 'veh-123',
        planId: 'plan-unlimited',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicleId).toBe('veh-123');
        expect(result.data.planId).toBe('plan-unlimited');
      }
    });

    it('fails when vehicleId is missing or empty', () => {
      const result = validateSubscribeVehicle({
        vehicleId: '   ',
        planId: 'plan-unlimited',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.vehicleId).toContain('Vehicle ID is required');
      }
    });

    it('fails when planId is missing or empty', () => {
      const result = validateSubscribeVehicle({
        vehicleId: 'veh-123',
        planId: '   ',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.planId).toContain('Please select a wash membership plan');
      }
    });

    it('handles non-object input gracefully', () => {
      const result = validateSubscribeVehicle(null);
      expect(result.success).toBe(false);
    });
  });

  describe('evaluateTransferEligibility & Broken Object Level Authorization (BOLA) protection', () => {
    const validParams = {
      sourceVehicle: { id: 'veh-civic', userId: 'user-michael' },
      targetVehicle: { id: 'veh-f150', userId: 'user-michael' },
      sourceSubscription: { id: 'sub-active', vehicleId: 'veh-civic', status: SubscriptionStatus.ACTIVE },
      targetVehicleSubscriptions: [] as { status: SubscriptionStatus }[],
    };

    it('approves transfer between two different vehicles owned by the same user with vacant target', () => {
      const result = evaluateTransferEligibility(validParams);
      expect(result.eligible).toBe(true);
    });

    it('approves transfer when target vehicle has only CANCELLED subscriptions', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        targetVehicleSubscriptions: [{ status: SubscriptionStatus.CANCELLED }],
      });
      expect(result.eligible).toBe(true);
    });

    it('rejects transfer when source and target vehicles are identical', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        targetVehicle: { id: 'veh-civic', userId: 'user-michael' },
      });
      expect(result).toEqual({ eligible: false, reason: 'IDENTICAL_VEHICLES' });
      expect('message' in result).toBe(false);
    });

    it('rejects transfer across different users (BOLA protection)', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        targetVehicle: { id: 'veh-f150', userId: 'user-david' },
      });
      expect(result).toEqual({ eligible: false, reason: 'BOLA_DIFFERENT_OWNERS' });
      expect('message' in result).toBe(false);
    });

    it('rejects transfer when source subscription does not belong to source vehicle', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        sourceSubscription: { id: 'sub-active', vehicleId: 'veh-other', status: SubscriptionStatus.ACTIVE },
      });
      expect(result).toEqual({ eligible: false, reason: 'SOURCE_SUBSCRIPTION_MISMATCH' });
      expect('message' in result).toBe(false);
    });

    it('rejects transfer when source subscription is CANCELLED', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        sourceSubscription: { id: 'sub-cancelled', vehicleId: 'veh-civic', status: SubscriptionStatus.CANCELLED },
      });
      expect(result).toEqual({ eligible: false, reason: 'SOURCE_NOT_ACTIVE' });
      expect('message' in result).toBe(false);
    });

    it('rejects transfer when source subscription is OVERDUE', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        sourceSubscription: { id: 'sub-overdue', vehicleId: 'veh-civic', status: SubscriptionStatus.OVERDUE },
      });
      expect(result).toEqual({ eligible: false, reason: 'SOURCE_NOT_ACTIVE' });
      expect('message' in result).toBe(false);
    });

    it('rejects transfer when target vehicle already has an ACTIVE subscription (exclusivity)', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        targetVehicleSubscriptions: [{ status: SubscriptionStatus.ACTIVE }],
      });
      expect(result).toEqual({ eligible: false, reason: 'TARGET_NOT_VACANT' });
      expect('message' in result).toBe(false);
    });

    it('rejects transfer when target vehicle already has an OVERDUE subscription (exclusivity)', () => {
      const result = evaluateTransferEligibility({
        ...validParams,
        targetVehicleSubscriptions: [{ status: SubscriptionStatus.OVERDUE }],
      });
      expect(result).toEqual({ eligible: false, reason: 'TARGET_NOT_VACANT' });
      expect('message' in result).toBe(false);
    });
  });

  describe('TRANSFER_REJECTION_MESSAGES dictionary', () => {
    it('exhaustively defines non-empty string messages for all TransferRejectionReasons', () => {
      const reasons: TransferRejectionReason[] = [
        'IDENTICAL_VEHICLES',
        'BOLA_DIFFERENT_OWNERS',
        'SOURCE_SUBSCRIPTION_MISMATCH',
        'SOURCE_NOT_ACTIVE',
        'TARGET_NOT_VACANT',
      ];
      for (const reason of reasons) {
        expect(typeof TRANSFER_REJECTION_MESSAGES[reason]).toBe('string');
        expect(TRANSFER_REJECTION_MESSAGES[reason].length).toBeGreaterThan(0);
      }
    });
  });

  describe('canTransferSubscription helper', () => {
    it('returns true when evaluateTransferEligibility succeeds', () => {
      const params = {
        sourceVehicle: { id: 'veh-1', userId: 'user-1' },
        targetVehicle: { id: 'veh-2', userId: 'user-1' },
        sourceSubscription: { id: 'sub-1', vehicleId: 'veh-1', status: SubscriptionStatus.ACTIVE },
        targetVehicleSubscriptions: [],
      };
      expect(canTransferSubscription(params)).toBe(true);
    });

    it('returns false when evaluateTransferEligibility fails', () => {
      const params = {
        sourceVehicle: { id: 'veh-1', userId: 'user-1' },
        targetVehicle: { id: 'veh-2', userId: 'user-2' },
        sourceSubscription: { id: 'sub-1', vehicleId: 'veh-1', status: SubscriptionStatus.ACTIVE },
        targetVehicleSubscriptions: [],
      };
      expect(canTransferSubscription(params)).toBe(false);
    });
  });

  describe('transferSubscription pure transition', () => {
    const validParams = {
      sourceVehicle: { id: 'veh-civic', userId: 'user-michael' },
      targetVehicle: { id: 'veh-f150', userId: 'user-michael' },
      sourceSubscription: {
        id: 'sub-active',
        vehicleId: 'veh-civic',
        status: SubscriptionStatus.ACTIVE,
        planId: 'plan-express',
      },
      targetVehicleSubscriptions: [],
    };

    it('returns updated subscription with target vehicleId', () => {
      const updated = transferSubscription(validParams);
      expect(updated.id).toBe('sub-active');
      expect(updated.vehicleId).toBe('veh-f150');
      expect(updated.status).toBe(SubscriptionStatus.ACTIVE);
      expect(updated.planId).toBe('plan-express');
    });

    it('throws error when transfer criteria are violated', () => {
      const invalidParams = {
        ...validParams,
        targetVehicle: { id: 'veh-f150', userId: 'attacker-id' },
      };
      expect(() => transferSubscription(invalidParams)).toThrow(
        TRANSFER_REJECTION_MESSAGES.BOLA_DIFFERENT_OWNERS
      );
    });
  });

  describe('validateTransferSubscription', () => {
    it('validates a valid transfer input', () => {
      const result = validateTransferSubscription({
        subscriptionId: 'sub-123',
        targetVehicleId: 'veh-456',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subscriptionId).toBe('sub-123');
        expect(result.data.targetVehicleId).toBe('veh-456');
      }
    });

    it('fails when subscriptionId is missing or empty', () => {
      const result = validateTransferSubscription({
        subscriptionId: '   ',
        targetVehicleId: 'veh-456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.subscriptionId).toContain('Subscription ID is required');
      }
    });

    it('fails when targetVehicleId is missing or empty', () => {
      const result = validateTransferSubscription({
        subscriptionId: 'sub-123',
        targetVehicleId: '   ',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.targetVehicleId).toContain('Please select a target vehicle');
      }
    });

    it('handles non-object input gracefully', () => {
      const result = validateTransferSubscription(undefined);
      expect(result.success).toBe(false);
    });
  });
});
