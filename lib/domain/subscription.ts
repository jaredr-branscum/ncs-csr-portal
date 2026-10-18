import { z } from 'zod';
import { SubscriptionStatus, type Subscription } from '@prisma/client';
import type { ValidationResult } from './account';

export const SUBSCRIPTION_INVARIANT_ERRORS = {
  CANNOT_CANCEL_STATUS: (status: SubscriptionStatus) =>
    `Cannot cancel a subscription with status: ${status}`,
  ALREADY_HAS_ACTIVE:
    'Vehicle already has an active subscription. A vehicle can have at most one active subscription at any time.',
} as const;

export type SubscriptionSlot = Pick<Subscription, 'status'>;

/**
 * Checks if a subscription status occupies the vehicle's subscription slot.
 * ACTIVE and OVERDUE occupy the slot. CANCELLED is vacant.
 */
export function isSlotOccupied(status: SubscriptionStatus): boolean {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.OVERDUE;
}

/**
 * Returns the currently active/overdue subscription occupying the vehicle slot, if any.
 */
export function getActiveSubscription<T extends SubscriptionSlot>(
  subscriptions: T[]
): T | undefined {
  return subscriptions.find((sub) => isSlotOccupied(sub.status));
}

/**
 * Determines whether a vehicle is vacant and eligible for a new subscription or incoming transfer.
 */
export function isVehicleVacant<T extends SubscriptionSlot>(
  subscriptions: T[]
): boolean {
  return !getActiveSubscription(subscriptions);
}

/**
 * Verifies whether a subscription is eligible to be cancelled.
 * Only ACTIVE or OVERDUE subscriptions can be cancelled.
 */
export function canCancelSubscription(status: SubscriptionStatus): boolean {
  return isSlotOccupied(status);
}

/**
 * Pure domain transition returning an updated subscription with CANCELLED status.
 */
export function cancelSubscription<T extends { status: SubscriptionStatus }>(
  subscription: T
): Omit<T, 'status'> & { status: typeof SubscriptionStatus.CANCELLED } {
  if (!canCancelSubscription(subscription.status)) {
    throw new Error(SUBSCRIPTION_INVARIANT_ERRORS.CANNOT_CANCEL_STATUS(subscription.status));
  }
  return {
    ...subscription,
    status: SubscriptionStatus.CANCELLED,
  };
}

/**
 * Verifies whether a new subscription pass can be attached to a vehicle.
 * Enforces Vehicle Subscription Exclusivity: vehicle must be vacant (no ACTIVE or OVERDUE pass).
 */
export function canAttachSubscription<T extends SubscriptionSlot>(
  vehicleSubscriptions: T[]
): boolean {
  return isVehicleVacant(vehicleSubscriptions);
}

/**
 * Pure domain transition adding a new active subscription to a vehicle.
 * Enforces Vehicle Subscription Exclusivity invariant.
 */
export function attachSubscription<
  TExisting extends SubscriptionSlot,
  TNew extends SubscriptionSlot,
>(
  existingSubscriptions: TExisting[],
  newSubscription: TNew
): (TExisting | TNew)[] {
  if (!canAttachSubscription(existingSubscriptions)) {
    throw new Error(SUBSCRIPTION_INVARIANT_ERRORS.ALREADY_HAS_ACTIVE);
  }
  return [newSubscription, ...existingSubscriptions];
}

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().trim().min(1, 'Subscription ID is required'),
  reason: z.string().trim().max(200, 'Reason cannot exceed 200 characters').optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

/**
 * Validates cancellation mutation input.
 */
export function validateCancelSubscription(input: unknown): ValidationResult<CancelSubscriptionInput> {
  const result = cancelSubscriptionSchema.safeParse(input);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

export const subscribeVehicleSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle ID is required'),
  planId: z.string().trim().min(1, 'Please select a wash membership plan'),
});

export type SubscribeVehicleInput = z.infer<typeof subscribeVehicleSchema>;

/**
 * Validates attach subscription input.
 */
export function validateSubscribeVehicle(
  input: unknown
): ValidationResult<SubscribeVehicleInput> {
  const result = subscribeVehicleSchema.safeParse(input);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

export interface TransferEligibilityParams {
  sourceVehicle: { id: string; userId: string };
  targetVehicle: { id: string; userId: string };
  sourceSubscription: { id: string; vehicleId: string; status: SubscriptionStatus };
  targetVehicleSubscriptions: SubscriptionSlot[];
}

export type TransferRejectionReason =
  | 'IDENTICAL_VEHICLES'
  | 'BOLA_DIFFERENT_OWNERS'
  | 'SOURCE_SUBSCRIPTION_MISMATCH'
  | 'SOURCE_NOT_ACTIVE'
  | 'TARGET_NOT_VACANT';

export const TRANSFER_REJECTION_MESSAGES: Record<TransferRejectionReason, string> = {
  IDENTICAL_VEHICLES: 'Source and target vehicles cannot be the same vehicle.',
  BOLA_DIFFERENT_OWNERS:
    'Subscription transfer is strictly restricted between vehicles owned by the same customer.',
  SOURCE_SUBSCRIPTION_MISMATCH: 'Subscription does not belong to the source vehicle.',
  SOURCE_NOT_ACTIVE:
    'Cannot transfer subscription because it is not active. Only ACTIVE subscriptions can be transferred.',
  TARGET_NOT_VACANT:
    'Target vehicle already has an active subscription. Exclusivity rule: a car can only have one active subscription at any time.',
} as const;

export type TransferEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: TransferRejectionReason };

function checkVehicleOwnershipAndIdentity(
  sourceVehicle: { id: string; userId: string },
  targetVehicle: { id: string; userId: string }
): TransferEligibilityResult | null {
  if (sourceVehicle.id === targetVehicle.id) {
    return {
      eligible: false,
      reason: 'IDENTICAL_VEHICLES',
    };
  }

  if (sourceVehicle.userId !== targetVehicle.userId) {
    return {
      eligible: false,
      reason: 'BOLA_DIFFERENT_OWNERS',
    };
  }

  return null;
}

function checkSubscriptionAndTargetStatus(
  sourceVehicleId: string,
  sourceSubscription: { id: string; vehicleId: string; status: SubscriptionStatus },
  targetSubscriptions: SubscriptionSlot[]
): TransferEligibilityResult | null {
  if (sourceSubscription.vehicleId !== sourceVehicleId) {
    return {
      eligible: false,
      reason: 'SOURCE_SUBSCRIPTION_MISMATCH',
    };
  }

  if (sourceSubscription.status !== SubscriptionStatus.ACTIVE) {
    return {
      eligible: false,
      reason: 'SOURCE_NOT_ACTIVE',
    };
  }

  if (!canAttachSubscription(targetSubscriptions)) {
    return {
      eligible: false,
      reason: 'TARGET_NOT_VACANT',
    };
  }

  return null;
}

/**
 * Evaluates whether a subscription pass can be transferred between two vehicles.
 * Strictly enforces intra-account ownership (BOLA), vehicle exclusivity, and source active state.
 */
export function evaluateTransferEligibility(
  params: TransferEligibilityParams
): TransferEligibilityResult {
  const vehicleCheck = checkVehicleOwnershipAndIdentity(
    params.sourceVehicle,
    params.targetVehicle
  );
  if (vehicleCheck) return vehicleCheck;

  const statusCheck = checkSubscriptionAndTargetStatus(
    params.sourceVehicle.id,
    params.sourceSubscription,
    params.targetVehicleSubscriptions
  );
  if (statusCheck) return statusCheck;

  return { eligible: true };
}

/**
 * Boolean helper checking transfer eligibility.
 */
export function canTransferSubscription(params: TransferEligibilityParams): boolean {
  return evaluateTransferEligibility(params).eligible;
}

/**
 * Pure domain state transition reassigning a subscription to a target vehicle.
 * Enforces ownership invariants, exclusivity, and source active status.
 */
export function transferSubscription<
  TSub extends { id: string; vehicleId: string; status: SubscriptionStatus },
>(
  params: TransferEligibilityParams & { sourceSubscription: TSub }
): Omit<TSub, 'vehicleId'> & { vehicleId: string } {
  const check: TransferEligibilityResult = evaluateTransferEligibility(params);
  if (!check.eligible) {
    throw new Error(TRANSFER_REJECTION_MESSAGES[check.reason]);
  }

  return {
    ...params.sourceSubscription,
    vehicleId: params.targetVehicle.id,
  };
}

export const transferSubscriptionSchema = z.object({
  subscriptionId: z.string().trim().min(1, 'Subscription ID is required'),
  targetVehicleId: z.string().trim().min(1, 'Please select a target vehicle'),
});

export type TransferSubscriptionInput = z.infer<typeof transferSubscriptionSchema>;

export function validateTransferSubscription(
  input: unknown
): ValidationResult<TransferSubscriptionInput> {
  const result = transferSubscriptionSchema.safeParse(input);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
