import { z } from 'zod';
import { UserStatus, SubscriptionStatus } from '@prisma/client';
import type { ValidationResult } from './account';

export type OverdueResolutionRejectionReason =
  | 'ACCOUNT_INACTIVE'
  | 'NO_OVERDUE_BALANCE';

export const OVERDUE_RESOLUTION_REJECTION_MESSAGES: Record<
  OverdueResolutionRejectionReason,
  string
> = {
  ACCOUNT_INACTIVE:
    'Cannot resolve payment for an inactive account. Please reactivate the customer account first.',
  NO_OVERDUE_BALANCE: 'Customer does not have an outstanding overdue balance.',
} as const;

export const OVERDUE_INVARIANT_ERRORS = {
  SUBSCRIPTION_NOT_OVERDUE: (status: SubscriptionStatus) =>
    `Cannot resolve payment for subscription with status: ${status}. Only OVERDUE subscriptions can be resolved.`,
  CUSTOMER_NOT_OVERDUE: (status: UserStatus) =>
    `Cannot resolve payment for customer with status: ${status}. Only OVERDUE accounts can be resolved.`,
} as const;

export interface SettlementDescriptions {
  SINGLE: (planName: string) => string;
  MULTI: (planNames: readonly string[]) => string;
  ACCOUNT_BALANCE: string;
}

export const OVERDUE_SETTLEMENT_DESCRIPTIONS: SettlementDescriptions = {
  SINGLE: (planName: string) => `${planName} — Overdue Payment Resolution`,
  MULTI: (planNames: readonly string[]) =>
    `${planNames.join(', ')} — Overdue Payment Resolution`,
  ACCOUNT_BALANCE: 'Account Balance Settlement — Overdue Payment Resolution',
} as const;

export type OverdueResolutionEligibilityResult =
  | { eligible: true; overdueSubscriptionCount: number }
  | { eligible: false; reason: OverdueResolutionRejectionReason };

export interface OverdueCustomerState {
  status: UserStatus;
  subscriptions?: readonly { status: SubscriptionStatus }[];
}

/**
 * Evaluates whether a customer has overdue delinquency that can be resolved.
 * Only accounts with OVERDUE user status or OVERDUE subscriptions can be resolved.
 * Inactive/churned accounts must be reactivated first.
 */
export function evaluateOverdueResolutionEligibility(
  customer: OverdueCustomerState
): OverdueResolutionEligibilityResult {
  if (customer.status === UserStatus.INACTIVE) {
    return {
      eligible: false,
      reason: 'ACCOUNT_INACTIVE',
    };
  }

  const subscriptions = customer.subscriptions ?? [];
  const overdueSubs = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.OVERDUE
  );
  const isOverdue =
    customer.status === UserStatus.OVERDUE || overdueSubs.length > 0;

  if (!isOverdue) {
    return {
      eligible: false,
      reason: 'NO_OVERDUE_BALANCE',
    };
  }

  return {
    eligible: true,
    overdueSubscriptionCount: overdueSubs.length,
  };
}

/**
 * Predicate determining if overdue payment resolution can be triggered.
 */
export function canResolveOverduePayment(customer: OverdueCustomerState): boolean {
  return evaluateOverdueResolutionEligibility(customer).eligible;
}

export interface OverdueSubscriptionItem {
  id: string;
  plan: {
    name: string;
    priceCents: number;
  };
}

export interface OverdueSettlementCalculation {
  totalAmountCents: number;
  subscriptionCount: number;
  subscriptionIds: string[];
}

/**
 * Calculates the settlement total and IDs in integer cents.
 * Pure mathematical calculation decoupled from presentation strings.
 */
export function calculateOverdueSettlement(
  overdueSubscriptions: readonly OverdueSubscriptionItem[]
): OverdueSettlementCalculation {
  const totalAmountCents = overdueSubscriptions.reduce(
    (sum, sub) => sum + sub.plan.priceCents,
    0
  );
  const subscriptionIds = overdueSubscriptions.map((s) => s.id);

  return {
    totalAmountCents,
    subscriptionCount: overdueSubscriptions.length,
    subscriptionIds,
  };
}

/**
 * Formats user-facing purchase/ledger description using the exhaustive dictionary.
 */
export function formatSettlementDescription(
  overdueSubscriptions: readonly OverdueSubscriptionItem[],
  descriptions: SettlementDescriptions = OVERDUE_SETTLEMENT_DESCRIPTIONS
): string {
  if (overdueSubscriptions.length === 1) {
    return descriptions.SINGLE(overdueSubscriptions[0].plan.name);
  }
  if (overdueSubscriptions.length > 1) {
    const planNames = overdueSubscriptions.map((s) => s.plan.name);
    return descriptions.MULTI(planNames);
  }
  return descriptions.ACCOUNT_BALANCE;
}

/**
 * Pure domain state transition resolving an overdue subscription to ACTIVE.
 * Sets next billing date and updates status using strict enum constant.
 */
export function resolveOverdueSubscription<
  T extends { status: SubscriptionStatus; nextBillingAt?: Date }
>(
  subscription: T,
  nextBillingAt: Date
): Omit<T, 'status' | 'nextBillingAt'> & { status: typeof SubscriptionStatus.ACTIVE; nextBillingAt: Date } {
  if (subscription.status !== SubscriptionStatus.OVERDUE) {
    throw new Error(OVERDUE_INVARIANT_ERRORS.SUBSCRIPTION_NOT_OVERDUE(subscription.status));
  }

  return {
    ...subscription,
    status: SubscriptionStatus.ACTIVE,
    nextBillingAt,
  };
}

/**
 * Pure domain state transition flipping an overdue user's status to ACTIVE.
 */
export function resolveCustomerOverdueStatus<T extends { status: UserStatus }>(
  customer: T
): Omit<T, 'status'> & { status: typeof UserStatus.ACTIVE } {
  if (customer.status !== UserStatus.OVERDUE) {
    throw new Error(OVERDUE_INVARIANT_ERRORS.CUSTOMER_NOT_OVERDUE(customer.status));
  }

  return {
    ...customer,
    status: UserStatus.ACTIVE,
  };
}

export const resolveOverduePaymentSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  subscriptionIds: z.array(z.string().trim().min(1)).optional(),
});

export type ResolveOverduePaymentInput = z.infer<typeof resolveOverduePaymentSchema>;

/**
 * Validates and sanitizes overdue resolution input.
 */
export function validateResolveOverduePayment(
  input: unknown
): ValidationResult<ResolveOverduePaymentInput> {
  const result = resolveOverduePaymentSchema.safeParse(input);

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
