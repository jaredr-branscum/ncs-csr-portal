import { z } from 'zod';
import { UserStatus, SubscriptionStatus } from '@prisma/client';

export const updateAccountSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 digits')
    .max(26, 'Phone number cannot exceed 26 characters')
    .regex(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s./()0-9]*$/,
      'Please enter a valid phone number format'
    ),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

/**
 * Validates and sanitizes customer account modification input.
 */
export function validateUpdateAccount(input: unknown): ValidationResult<UpdateAccountInput> {
  const result = updateAccountSchema.safeParse(input);

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

export type DeactivateAccountRejectionReason = 'ALREADY_INACTIVE';

export const DEACTIVATE_ACCOUNT_REJECTION_MESSAGES: Record<
  DeactivateAccountRejectionReason,
  string
> = {
  ALREADY_INACTIVE: 'Customer account is already inactive.',
} as const;

export type ReactivateAccountRejectionReason = 'ALREADY_ACTIVE' | 'ACCOUNT_OVERDUE';

export const REACTIVATE_ACCOUNT_REJECTION_MESSAGES: Record<
  ReactivateAccountRejectionReason,
  string
> = {
  ALREADY_ACTIVE: 'Customer account is already active.',
  ACCOUNT_OVERDUE:
    'Cannot reactivate an overdue account. Outstanding balances must be resolved through payment settlement.',
} as const;

export const ACCOUNT_INVARIANT_ERRORS = {
  CANNOT_DEACTIVATE_INACTIVE:
    'Cannot deactivate an account that is already INACTIVE.',
  CANNOT_REACTIVATE_ACTIVE:
    'Cannot reactivate an account that is already ACTIVE.',
  CANNOT_REACTIVATE_OVERDUE:
    'Cannot reactivate an account that is OVERDUE. Settle outstanding balances via payment resolution.',
} as const;

export type DeactivateAccountEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: DeactivateAccountRejectionReason };

export type ReactivateAccountEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: ReactivateAccountRejectionReason };

export function evaluateAccountDeactivationEligibility(customer: {
  status: UserStatus;
}): DeactivateAccountEligibilityResult {
  if (customer.status === UserStatus.INACTIVE) {
    return {
      eligible: false,
      reason: 'ALREADY_INACTIVE',
    };
  }
  return { eligible: true };
}

export function evaluateAccountReactivationEligibility(customer: {
  status: UserStatus;
}): ReactivateAccountEligibilityResult {
  if (customer.status === UserStatus.ACTIVE) {
    return {
      eligible: false,
      reason: 'ALREADY_ACTIVE',
    };
  }
  if (customer.status === UserStatus.OVERDUE) {
    return {
      eligible: false,
      reason: 'ACCOUNT_OVERDUE',
    };
  }
  return { eligible: true };
}

export function canDeactivateAccount(status: UserStatus): boolean {
  return status !== UserStatus.INACTIVE;
}

export function canReactivateAccount(status: UserStatus): boolean {
  return status === UserStatus.INACTIVE;
}

export interface SubscriptionToCascade {
  id: string;
  status: SubscriptionStatus;
}

export interface DeactivatedAccountState<TUser, TSub> {
  user: Omit<TUser, 'status'> & { status: typeof UserStatus.INACTIVE };
  cancelledSubscriptions: (Omit<TSub, 'status'> & { status: typeof SubscriptionStatus.CANCELLED })[];
  cancelledSubscriptionIds: string[];
}

/**
 * Pure domain state transition executing account deactivation.
 * Cascades cancellation to all active or overdue vehicle passes while preserving purchase history.
 */
export function deactivateAccount<
  TUser extends { status: UserStatus },
  TSub extends SubscriptionToCascade
>(
  customer: TUser,
  subscriptions: readonly TSub[] = []
): DeactivatedAccountState<TUser, TSub> {
  if (customer.status === UserStatus.INACTIVE) {
    throw new Error(ACCOUNT_INVARIANT_ERRORS.CANNOT_DEACTIVATE_INACTIVE);
  }

  const activeOrOverdue = subscriptions.filter(
    (s) =>
      s.status === SubscriptionStatus.ACTIVE ||
      s.status === SubscriptionStatus.OVERDUE
  );

  const cancelledSubscriptions = activeOrOverdue.map((s) => ({
    ...s,
    status: SubscriptionStatus.CANCELLED,
  }));

  const cancelledSubscriptionIds = activeOrOverdue.map((s) => s.id);

  return {
    user: {
      ...customer,
      status: UserStatus.INACTIVE,
    },
    cancelledSubscriptions,
    cancelledSubscriptionIds,
  };
}

/**
 * Pure domain state transition reactivating an inactive account.
 */
export function reactivateAccount<TUser extends { status: UserStatus }>(
  customer: TUser
): Omit<TUser, 'status'> & { status: typeof UserStatus.ACTIVE } {
  if (customer.status === UserStatus.ACTIVE) {
    throw new Error(ACCOUNT_INVARIANT_ERRORS.CANNOT_REACTIVATE_ACTIVE);
  }
  if (customer.status === UserStatus.OVERDUE) {
    throw new Error(ACCOUNT_INVARIANT_ERRORS.CANNOT_REACTIVATE_OVERDUE);
  }

  return {
    ...customer,
    status: UserStatus.ACTIVE,
  };
}

export const deactivateAccountSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export type DeactivateAccountInput = z.infer<typeof deactivateAccountSchema>;

export function validateDeactivateAccount(
  input: unknown
): ValidationResult<DeactivateAccountInput> {
  const result = deactivateAccountSchema.safeParse(input);
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

export const reactivateAccountSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export type ReactivateAccountInput = z.infer<typeof reactivateAccountSchema>;

export function validateReactivateAccount(
  input: unknown
): ValidationResult<ReactivateAccountInput> {
  const result = reactivateAccountSchema.safeParse(input);
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

export function shouldRestoreActiveAccountStatus(params: {
  currentStatus: UserStatus;
  remainingOverdueSubscriptionsCount: number;
}): boolean {
  return (
    params.currentStatus === UserStatus.OVERDUE &&
    params.remainingOverdueSubscriptionsCount === 0
  );
}
