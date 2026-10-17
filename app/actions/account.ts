'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  validateUpdateAccount,
  validateDeactivateAccount,
  validateReactivateAccount,
  evaluateAccountDeactivationEligibility,
  evaluateAccountReactivationEligibility,
  deactivateAccount,
  reactivateAccount,
  DEACTIVATE_ACCOUNT_REJECTION_MESSAGES,
  REACTIVATE_ACCOUNT_REJECTION_MESSAGES,
} from '@/lib/domain/account';
import {
  createAuditEvent,
  toAuditLogData,
  AuditAction,
  AUDIT_DESCRIPTIONS,
  type CsrOperator,
} from '@/lib/domain/audit';
import { getAuthenticatedOperator } from '@/lib/auth/session';
import { Prisma, UserStatus, SubscriptionStatus } from '@prisma/client';
import type { ActionFailure } from '@/lib/types/action';

const ACCOUNT_ACTION_MESSAGES = {
  CUSTOMER_NOT_FOUND: 'Customer record not found.',
  EMAIL_ALREADY_IN_USE: 'This email address is already in use by another customer.',
  UPDATE_FAILED: 'Failed to update account details.',
  DEACTIVATE_FAILED: 'Failed to deactivate account. Please try again or contact engineering.',
  REACTIVATE_FAILED: 'Failed to reactivate account. Please try again or contact engineering.',
} as const;

export type AccountActionSuccess = {
  success: true;
  cancelledSubscriptionCount?: number;
  formError?: never;
  fieldErrors?: never;
};

export type AccountActionResult = AccountActionSuccess | ActionFailure;

function accountFailure(
  formError?: string,
  fieldErrors?: Record<string, string>
): AccountActionResult {
  return {
    success: false,
    formError,
    fieldErrors,
  };
}

function parseAccountFormData(formData: FormData) {
  return {
    userId: formData.get('userId')?.toString() ?? '',
    name: formData.get('name')?.toString() ?? '',
    email: formData.get('email')?.toString() ?? '',
    phone: formData.get('phone')?.toString() ?? '',
  };
}

function handleUpdateAccountError(error: unknown, userId: string): AccountActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return accountFailure(undefined, { email: ACCOUNT_ACTION_MESSAGES.EMAIL_ALREADY_IN_USE });
  }

  console.error('[updateAccountAction] Unexpected failure updating customer account:', {
    targetUserId: userId,
    error,
  });

  return accountFailure(ACCOUNT_ACTION_MESSAGES.UPDATE_FAILED);
}

export async function updateAccountAction(
  _prevState: AccountActionResult | null,
  formData: FormData
): Promise<AccountActionResult> {
  const parsed = parseAccountFormData(formData);
  const validationResult = validateUpdateAccount(parsed);
  if (!validationResult.success) return accountFailure(undefined, validationResult.errors);

  const { data } = validationResult;
  const operator = await getAuthenticatedOperator();

  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.UPDATE_ACCOUNT,
    targetUserId: data.userId,
    targetCustomerName: data.name,
    details: AUDIT_DESCRIPTIONS[AuditAction.UPDATE_ACCOUNT]({
      name: data.name,
      email: data.email,
      phone: data.phone,
    }),
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: { name: data.name, email: data.email, phone: data.phone },
      });
      await tx.auditLog.create({ data: toAuditLogData(auditEvent) });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleUpdateAccountError(error, data.userId);
  }
}

interface PersistDeactivationParams {
  userId: string;
  cancelledSubscriptionIds: string[];
  customerName?: string;
  reason?: string;
  operator: CsrOperator;
}

async function persistDeactivation({
  userId,
  cancelledSubscriptionIds,
  customerName,
  reason,
  operator,
}: PersistDeactivationParams) {
  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.DEACTIVATE_ACCOUNT,
    targetUserId: userId,
    targetCustomerName: customerName,
    details: AUDIT_DESCRIPTIONS[AuditAction.DEACTIVATE_ACCOUNT]({
      cascadedCount: cancelledSubscriptionIds.length,
      reason,
    }),
  });

  await prisma.$transaction(async (tx) => {
    if (cancelledSubscriptionIds.length > 0) {
      await tx.subscription.updateMany({
        where: { id: { in: cancelledSubscriptionIds } },
        data: { status: SubscriptionStatus.CANCELLED },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: { status: UserStatus.INACTIVE },
    });

    await tx.auditLog.create({ data: toAuditLogData(auditEvent) });
  });
}

export async function deactivateAccountAction(
  _prevState: AccountActionResult | null,
  formData: FormData
): Promise<AccountActionResult> {
  const parsed = {
    userId: formData.get('userId')?.toString() ?? '',
    reason: formData.get('reason')?.toString() ?? undefined,
  };
  const validation = validateDeactivateAccount(parsed);
  if (!validation.success) return accountFailure(undefined, validation.errors);

  const { userId, reason } = validation.data;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      vehicles: {
        where: { deletedAt: null },
        include: { subscriptions: true },
      },
    },
  });

  if (!user) return accountFailure(ACCOUNT_ACTION_MESSAGES.CUSTOMER_NOT_FOUND);

  const eligibility = evaluateAccountDeactivationEligibility(user);
  if (!eligibility.eligible) {
    return accountFailure(DEACTIVATE_ACCOUNT_REJECTION_MESSAGES[eligibility.reason]);
  }

  const subscriptions = user.vehicles.flatMap((v) => v.subscriptions);
  const transition = deactivateAccount(user, subscriptions);
  const operator = await getAuthenticatedOperator();

  try {
    await persistDeactivation({
      userId,
      cancelledSubscriptionIds: transition.cancelledSubscriptionIds,
      customerName: user.name,
      reason,
      operator,
    });
    revalidatePath('/');
    return { success: true, cancelledSubscriptionCount: transition.cancelledSubscriptionIds.length };
  } catch (error) {
    console.error('[deactivateAccountAction] Unexpected error:', { userId, error });
    return accountFailure(ACCOUNT_ACTION_MESSAGES.DEACTIVATE_FAILED);
  }
}

async function persistReactivation(
  userId: string,
  customerName: string,
  operator: CsrOperator,
  reason?: string
) {
  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.REACTIVATE_ACCOUNT,
    targetUserId: userId,
    targetCustomerName: customerName,
    details: AUDIT_DESCRIPTIONS[AuditAction.REACTIVATE_ACCOUNT]({ reason }),
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    await tx.auditLog.create({ data: toAuditLogData(auditEvent) });
  });
}

export async function reactivateAccountAction(
  _prevState: AccountActionResult | null,
  formData: FormData
): Promise<AccountActionResult> {
  const parsed = {
    userId: formData.get('userId')?.toString() ?? '',
    reason: formData.get('reason')?.toString() ?? undefined,
  };
  const validation = validateReactivateAccount(parsed);
  if (!validation.success) return accountFailure(undefined, validation.errors);

  const { userId, reason } = validation.data;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return accountFailure(ACCOUNT_ACTION_MESSAGES.CUSTOMER_NOT_FOUND);

  const eligibility = evaluateAccountReactivationEligibility(user);
  if (!eligibility.eligible) {
    return accountFailure(REACTIVATE_ACCOUNT_REJECTION_MESSAGES[eligibility.reason]);
  }

  reactivateAccount(user);
  const operator = await getAuthenticatedOperator();

  try {
    await persistReactivation(userId, user.name, operator, reason);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[reactivateAccountAction] Unexpected error:', { userId, error });
    return accountFailure(ACCOUNT_ACTION_MESSAGES.REACTIVATE_FAILED);
  }
}
