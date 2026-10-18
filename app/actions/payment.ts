'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  UserStatus,
  SubscriptionStatus,
  PurchaseStatus,
  PurchaseType,
  Prisma,
} from '@prisma/client';
import {
  validateResolveOverduePayment,
  evaluateOverdueResolutionEligibility,
  calculateOverdueSettlement,
  formatSettlementDescription,
  OVERDUE_RESOLUTION_REJECTION_MESSAGES,
  type OverdueSubscriptionItem,
  type OverdueSettlementCalculation,
} from '@/lib/domain/payment';
import {
  createAuditEvent,
  toAuditLogData,
  AuditAction,
  AUDIT_DESCRIPTIONS,
  type CsrOperator,
  type AuditEvent,
} from '@/lib/domain/audit';
import { getAuthenticatedOperator } from '@/lib/auth/session';
import { calculateNextBillingDate } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/utils/currency';

const PAYMENT_ACTION_MESSAGES = {
  CUSTOMER_NOT_FOUND: 'Customer record not found.',
  NO_SUBSCRIPTIONS_SELECTED: 'No valid overdue subscriptions selected for resolution.',
  UNEXPECTED_ERROR:
    'Failed to resolve overdue payment. Please try again or contact engineering.',
} as const;

import type { ActionResult } from '@/lib/types/action';

export type PaymentActionResult = ActionResult;

function paymentFailure(
  formError?: string,
  fieldErrors?: Record<string, string>
): PaymentActionResult {
  return {
    success: false,
    formError,
    fieldErrors,
  };
}

function parsePaymentFormData(formData: FormData) {
  const subscriptionIds = formData
    .getAll('subscriptionIds')
    .map(String)
    .filter((id) => id.length > 0);

  return {
    userId: formData.get('userId')?.toString() ?? '',
    subscriptionIds: subscriptionIds.length > 0 ? subscriptionIds : undefined,
  };
}

function handlePaymentError(error: unknown, userId: string): PaymentActionResult {
  console.error('[resolveOverduePaymentAction] Unexpected failure resolving overdue balance:', {
    targetUserId: userId,
    error,
  });

  return paymentFailure(PAYMENT_ACTION_MESSAGES.UNEXPECTED_ERROR);
}

interface PersistSettlementParams {
  userId: string;
  customerName: string;
  overdueSubscriptions: readonly OverdueSubscriptionItem[];
  operator: CsrOperator;
}

interface SettlementUpdateParams {
  userId: string;
  settlement: OverdueSettlementCalculation;
  description: string;
  nextBillingAt: Date;
  auditEvent: AuditEvent;
}

async function applySettlementUpdates(
  tx: Prisma.TransactionClient,
  params: SettlementUpdateParams
) {
  if (params.settlement.subscriptionIds.length > 0) {
    const overdueCount = await tx.subscription.count({
      where: {
        id: { in: params.settlement.subscriptionIds },
        status: SubscriptionStatus.OVERDUE,
      },
    });
    if (overdueCount !== params.settlement.subscriptionIds.length) return false;
  }

  if (params.settlement.totalAmountCents > 0) {
    await tx.purchase.create({
      data: {
        userId: params.userId,
        description: params.description,
        amountCents: params.settlement.totalAmountCents,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
      },
    });
  }

  if (params.settlement.subscriptionIds.length > 0) {
    await tx.subscription.updateMany({
      where: {
        id: { in: params.settlement.subscriptionIds },
        status: SubscriptionStatus.OVERDUE,
      },
      data: { status: SubscriptionStatus.ACTIVE, nextBillingAt: params.nextBillingAt },
    });
  }

  const remainingOverdueCount = await tx.subscription.count({
    where: {
      vehicle: { userId: params.userId, deletedAt: null },
      status: SubscriptionStatus.OVERDUE,
    },
  });

  if (remainingOverdueCount === 0) {
    await tx.user.update({
      where: { id: params.userId },
      data: { status: UserStatus.ACTIVE },
    });
  }

  await tx.auditLog.create({ data: toAuditLogData(params.auditEvent) });
  return true;
}

async function persistOverdueSettlement({
  userId,
  customerName,
  overdueSubscriptions,
  operator,
}: PersistSettlementParams) {
  const settlement = calculateOverdueSettlement(overdueSubscriptions);
  const description =
    settlement.totalAmountCents > 0
      ? formatSettlementDescription(overdueSubscriptions)
      : 'Account Delinquency Resolution';
  const nextBillingAt = calculateNextBillingDate();

  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.RESOLVE_OVERDUE_PAYMENT,
    targetUserId: userId,
    targetCustomerName: customerName,
    details:
      settlement.totalAmountCents > 0
        ? AUDIT_DESCRIPTIONS[AuditAction.RESOLVE_OVERDUE_PAYMENT]({
            formattedAmount: formatCurrency(settlement.totalAmountCents),
            description,
          })
        : 'Resolved account delinquency status ($0.00) — no active overdue passes remain. Restored wash gate access to ACTIVE.',
  });

  await prisma.$transaction(async (tx) => {
    await applySettlementUpdates(tx, {
      userId,
      settlement,
      description,
      nextBillingAt,
      auditEvent,
    });
  });
}

async function fetchOverdueUserData(userId: string, subscriptionIds?: string[]) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      vehicles: {
        where: { deletedAt: null },
        include: {
          subscriptions: {
            where: { status: SubscriptionStatus.OVERDUE },
            include: { plan: true },
          },
        },
      },
    },
  });

  if (!user) return null;

  const allOverdue = user.vehicles.flatMap((v) => v.subscriptions);
  const overdueSubscriptions =
    subscriptionIds && subscriptionIds.length > 0
      ? allOverdue.filter((s) => subscriptionIds.includes(s.id))
      : allOverdue;

  return { user, overdueSubscriptions };
}

export async function resolveOverduePaymentAction(
  _prevState: PaymentActionResult | null,
  formData: FormData
): Promise<PaymentActionResult> {
  const parsed = parsePaymentFormData(formData);
  const validationResult = validateResolveOverduePayment(parsed);

  if (!validationResult.success) {
    return paymentFailure(undefined, validationResult.errors);
  }

  const { userId, subscriptionIds } = validationResult.data;
  const userData = await fetchOverdueUserData(userId, subscriptionIds);

  if (!userData) {
    return paymentFailure(PAYMENT_ACTION_MESSAGES.CUSTOMER_NOT_FOUND);
  }

  const { user, overdueSubscriptions } = userData;
  if (overdueSubscriptions.length === 0 && user.status !== UserStatus.OVERDUE) {
    return paymentFailure(PAYMENT_ACTION_MESSAGES.NO_SUBSCRIPTIONS_SELECTED);
  }

  const eligibility = evaluateOverdueResolutionEligibility({
    status: user.status,
    subscriptions: overdueSubscriptions,
  });

  if (!eligibility.eligible) {
    return paymentFailure(OVERDUE_RESOLUTION_REJECTION_MESSAGES[eligibility.reason]);
  }

  try {
    const operator = await getAuthenticatedOperator();
    await persistOverdueSettlement({
      userId: user.id,
      customerName: user.name,
      overdueSubscriptions,
      operator,
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handlePaymentError(error, userId);
  }
}
