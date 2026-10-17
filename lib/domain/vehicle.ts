import { z } from 'zod';
import { SubscriptionStatus } from '@prisma/client';
import type { ValidationResult } from './account';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Normalizes a license plate by trimming, collapsing spaces, and converting to uppercase.
 */
export function normalizeLicensePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, ' ');
}

export const addVehicleSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  licensePlate: z
    .string()
    .trim()
    .min(1, 'License plate is required')
    .max(20, 'License plate cannot exceed 20 characters')
    .regex(
      /^[\p{L}\p{N}\s./-]+$/u,
      'License plate can only contain letters, numbers, spaces, dots, and hyphens'
    )
    .transform(normalizeLicensePlate),
  make: z
    .string()
    .trim()
    .min(1, 'Vehicle make is required')
    .max(50, 'Make cannot exceed 50 characters'),
  model: z
    .string()
    .trim()
    .min(1, 'Vehicle model is required')
    .max(50, 'Model cannot exceed 50 characters'),
  year: z.coerce
    .number({ message: 'Year must be a valid number' })
    .int('Year must be an integer')
    .min(1900, 'Year must be 1900 or later')
    .max(CURRENT_YEAR + 2, `Year cannot be later than ${CURRENT_YEAR + 2}`),
  color: z
    .string()
    .trim()
    .min(1, 'Vehicle color is required')
    .max(30, 'Color cannot exceed 30 characters'),
});

export type AddVehicleInput = z.infer<typeof addVehicleSchema>;

/**
 * Validates and sanitizes vehicle creation input.
 */
export function validateAddVehicle(input: unknown): ValidationResult<AddVehicleInput> {
  const result = addVehicleSchema.safeParse(input);

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

export type VehicleRemovalRejectionReason =
  | 'BOLA_OWNERSHIP_MISMATCH'
  | 'ALREADY_REMOVED'
  | 'HAS_ACTIVE_SUBSCRIPTION'
  | 'HAS_OVERDUE_SUBSCRIPTION';

export const VEHICLE_REMOVAL_REJECTION_MESSAGES: Record<
  VehicleRemovalRejectionReason,
  string
> = {
  BOLA_OWNERSHIP_MISMATCH: 'Vehicle does not belong to the specified customer.',
  ALREADY_REMOVED: 'Vehicle has already been removed.',
  HAS_ACTIVE_SUBSCRIPTION:
    'Cannot remove vehicle with an active subscription. Please cancel or transfer the subscription first.',
  HAS_OVERDUE_SUBSCRIPTION:
    'Cannot remove vehicle with an overdue subscription. Please resolve the outstanding payment or cancel the subscription first.',
} as const;

export type VehicleRemovalEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: VehicleRemovalRejectionReason };

export interface VehicleRemovalParams {
  vehicle: {
    id: string;
    userId: string;
    subscriptions?: readonly { status: SubscriptionStatus }[];
    deletedAt?: Date | null;
  };
  requestingUserId: string;
}

/**
 * Evaluates whether a vehicle is eligible for removal from a customer's garage.
 * Strictly enforces intra-account ownership (BOLA), active/overdue subscription rules, and soft delete state.
 */
export function evaluateVehicleRemovalEligibility(
  params: VehicleRemovalParams
): VehicleRemovalEligibilityResult {
  if (params.vehicle.userId !== params.requestingUserId) {
    return {
      eligible: false,
      reason: 'BOLA_OWNERSHIP_MISMATCH',
    };
  }

  if (params.vehicle.deletedAt) {
    return {
      eligible: false,
      reason: 'ALREADY_REMOVED',
    };
  }

  const subscriptions = params.vehicle.subscriptions ?? [];
  const activeSub = subscriptions.find(
    (s) => s.status === SubscriptionStatus.ACTIVE
  );
  if (activeSub) {
    return {
      eligible: false,
      reason: 'HAS_ACTIVE_SUBSCRIPTION',
    };
  }

  const overdueSub = subscriptions.find(
    (s) => s.status === SubscriptionStatus.OVERDUE
  );
  if (overdueSub) {
    return {
      eligible: false,
      reason: 'HAS_OVERDUE_SUBSCRIPTION',
    };
  }

  return { eligible: true };
}

/**
 * Checks whether a vehicle can be safely removed.
 */
export function canRemoveVehicle(
  vehicle: {
    id: string;
    userId: string;
    subscriptions?: readonly { status: SubscriptionStatus }[];
    deletedAt?: Date | null;
  },
  requestingUserId: string
): boolean {
  return evaluateVehicleRemovalEligibility({ vehicle, requestingUserId }).eligible;
}

export const removeVehicleSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle ID is required'),
  userId: z.string().trim().min(1, 'User ID is required'),
});

export type RemoveVehicleInput = z.infer<typeof removeVehicleSchema>;

/**
 * Validates and sanitizes vehicle removal input.
 */
export function validateRemoveVehicle(input: unknown): ValidationResult<RemoveVehicleInput> {
  const result = removeVehicleSchema.safeParse(input);

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
