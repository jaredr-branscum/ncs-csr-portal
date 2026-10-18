'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  validateCancelSubscription,
  canCancelSubscription,
  validateSubscribeVehicle,
  canAttachSubscription,
  validateTransferSubscription,
  evaluateTransferEligibility,
  TRANSFER_REJECTION_MESSAGES,
} from '@/lib/domain/subscription';
import {
  createAuditEvent,
  toAuditLogData,
  AuditAction,
  type AuditEvent,
  type CsrOperator,
} from '@/lib/domain/audit';
import { getAuthenticatedOperator } from '@/lib/auth/session';
import { calculateNextBillingDate } from '@/lib/utils/date';
import { SubscriptionStatus, PurchaseStatus, PurchaseType, UserStatus } from '@prisma/client';
import { shouldRestoreActiveAccountStatus } from '@/lib/domain/account';

const SUBSCRIPTION_ACTION_MESSAGES = {
  NOT_FOUND: 'Subscription record not found.',
  ALREADY_INACTIVE: (status: SubscriptionStatus) =>
    `Subscription cannot be cancelled because it is already ${status.toLowerCase()}.`,
  UNEXPECTED_ERROR: 'Failed to process subscription change. Please try again or contact engineering.',
} as const;

import type { ActionResult } from '@/lib/types/action';

export type SubscriptionActionResult = ActionResult;

function subscriptionFailure(
  formError?: string,
  fieldErrors?: Record<string, string>
): SubscriptionActionResult {
  return {
    success: false,
    formError,
    fieldErrors,
  };
}

function parseCancelFormData(formData: FormData) {
  const reasonVal = formData.get('reason')?.toString();
  return {
    subscriptionId: formData.get('subscriptionId')?.toString() ?? '',
    reason: reasonVal && reasonVal.trim() !== '' ? reasonVal : undefined,
  };
}

function parseSubscribeFormData(formData: FormData) {
  return {
    vehicleId: formData.get('vehicleId')?.toString() ?? '',
    planId: formData.get('planId')?.toString() ?? '',
  };
}

function parseTransferFormData(formData: FormData) {
  return {
    subscriptionId: formData.get('subscriptionId')?.toString() ?? '',
    targetVehicleId: formData.get('targetVehicleId')?.toString() ?? '',
  };
}

function handleSubscriptionError(
  actionName: string,
  error: unknown,
  targetUserId?: string
): SubscriptionActionResult {
  console.error(`[${actionName}] Unexpected failure:`, {
    targetUserId,
    error,
  });
  return subscriptionFailure(SUBSCRIPTION_ACTION_MESSAGES.UNEXPECTED_ERROR);
}

async function persistCancelledSubscription(
  subscriptionId: string,
  userId: string,
  userStatus: UserStatus,
  auditEvent: AuditEvent
) {
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.CANCELLED },
    });

    let details = auditEvent.details;
    if (userStatus === UserStatus.OVERDUE) {
      const remainingOverdueCount = await tx.subscription.count({
        where: {
          vehicle: { userId, deletedAt: null },
          status: SubscriptionStatus.OVERDUE,
          id: { not: subscriptionId },
        },
      });

      if (
        shouldRestoreActiveAccountStatus({
          currentStatus: userStatus,
          remainingOverdueSubscriptionsCount: remainingOverdueCount,
        })
      ) {
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.ACTIVE },
        });
        details = `${details}. Restored account status to ACTIVE (no overdue passes remain).`;
      }
    }

    await tx.auditLog.create({
      data: toAuditLogData({ ...auditEvent, details }),
    });
  });
}

export async function cancelSubscriptionAction(
  _prevState: SubscriptionActionResult | null,
  formData: FormData
): Promise<SubscriptionActionResult> {
  const parsed = parseCancelFormData(formData);
  const validationResult = validateCancelSubscription(parsed);
  if (!validationResult.success) {
    return subscriptionFailure(undefined, validationResult.errors);
  }

  const { data } = validationResult;
  const existingSub = await prisma.subscription.findUnique({
    where: { id: data.subscriptionId },
    include: {
      vehicle: { include: { user: true } },
      plan: true,
    },
  });

  if (!existingSub) return subscriptionFailure(SUBSCRIPTION_ACTION_MESSAGES.NOT_FOUND);
  if (!canCancelSubscription(existingSub.status)) {
    return subscriptionFailure(
      SUBSCRIPTION_ACTION_MESSAGES.ALREADY_INACTIVE(existingSub.status)
    );
  }

  const operator = await getAuthenticatedOperator();
  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.CANCEL_SUBSCRIPTION,
    targetUserId: existingSub.vehicle.userId,
    targetCustomerName: existingSub.vehicle.user.name,
    details: `Cancelled pass "${existingSub.plan.name}" on vehicle ${existingSub.vehicle.licensePlate} (${existingSub.vehicle.make} ${existingSub.vehicle.model})${
      data.reason ? `. Reason: ${data.reason}` : ''
    }`,
  });

  try {
    await persistCancelledSubscription(
      data.subscriptionId,
      existingSub.vehicle.userId,
      existingSub.vehicle.user.status,
      auditEvent
    );
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleSubscriptionError('cancelSubscriptionAction', error, existingSub.vehicle.userId);
  }
}

interface AttachedVehicleTarget {
  id: string;
  userId: string;
  user: { name: string };
  licensePlate: string;
  make: string;
  model: string;
  year: number;
}

interface AttachedPlanTarget {
  id: string;
  name: string;
  priceCents: number;
}

async function persistAttachedSubscription(
  vehicle: AttachedVehicleTarget,
  plan: AttachedPlanTarget,
  operator: CsrOperator
) {
  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.SUBSCRIBE_VEHICLE,
    targetUserId: vehicle.userId,
    targetCustomerName: vehicle.user.name,
    details: `Attached plan "${plan.name}" to vehicle ${vehicle.licensePlate} (${vehicle.year} ${vehicle.make} ${vehicle.model})`,
  });

  const nextBillingAt = calculateNextBillingDate();
  await prisma.$transaction(async (tx) => {
    const existingActive = await tx.subscription.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] },
      },
    });
    if (existingActive) {
      throw new Error('Vehicle already has an active subscription.');
    }

    await tx.subscription.create({
      data: {
        vehicleId: vehicle.id,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        nextBillingAt,
      },
    });
    await tx.purchase.create({
      data: {
        userId: vehicle.userId,
        description: `${plan.name} — Subscription Charge`,
        amountCents: plan.priceCents,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
      },
    });
    await tx.auditLog.create({ data: toAuditLogData(auditEvent) });
  });
}

export async function subscribeVehicleAction(
  _prevState: SubscriptionActionResult | null,
  formData: FormData
): Promise<SubscriptionActionResult> {
  const parsed = parseSubscribeFormData(formData);
  const validationResult = validateSubscribeVehicle(parsed);
  if (!validationResult.success) {
    return subscriptionFailure(undefined, validationResult.errors);
  }

  const { vehicleId, planId } = validationResult.data;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      user: true,
      subscriptions: {
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] },
        },
      },
    },
  });

  if (!vehicle || vehicle.deletedAt) return subscriptionFailure('Vehicle record not found.');
  if (vehicle.user.status === UserStatus.INACTIVE) {
    return subscriptionFailure(
      'Cannot attach a subscription pass to an inactive account. Please reactivate the customer account first.'
    );
  }
  if (!canAttachSubscription(vehicle.subscriptions)) {
    return subscriptionFailure(
      'Vehicle already has an active subscription. Exclusivity rule: a car can only have one active pass.'
    );
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return subscriptionFailure('Selected wash membership plan does not exist.');

  const operator = await getAuthenticatedOperator();

  try {
    await persistAttachedSubscription(vehicle, plan, operator);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleSubscriptionError('subscribeVehicleAction', error, vehicle.userId);
  }
}

async function persistTransferredSubscription(
  sub: {
    id: string;
    plan: { name: string };
    vehicle: {
      licensePlate: string;
      make: string;
      model: string;
      year: number;
      userId: string;
      user: { name: string };
    };
  },
  targetVehicle: {
    id: string;
    licensePlate: string;
    make: string;
    model: string;
    year: number;
  },
  operator: CsrOperator
) {
  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.TRANSFER_SUBSCRIPTION,
    targetUserId: sub.vehicle.userId,
    targetCustomerName: sub.vehicle.user.name,
    details: `Transferred "${sub.plan.name}" subscription from ${sub.vehicle.licensePlate} (${sub.vehicle.year} ${sub.vehicle.make} ${sub.vehicle.model}) to ${targetVehicle.licensePlate} (${targetVehicle.year} ${targetVehicle.make} ${targetVehicle.model})`,
  });

  await prisma.$transaction(async (tx) => {
    const existingActive = await tx.subscription.findFirst({
      where: {
        vehicleId: targetVehicle.id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] },
      },
    });
    if (existingActive) {
      throw new Error('Target vehicle already has an active subscription.');
    }

    await tx.subscription.update({
      where: { id: sub.id },
      data: { vehicleId: targetVehicle.id },
    });
    await tx.auditLog.create({ data: toAuditLogData(auditEvent) });
  });
}

async function findTransferEntities(subscriptionId: string, targetVehicleId: string) {
  const existingSub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      vehicle: { include: { user: true } },
      plan: true,
    },
  });

  const targetVehicle = await prisma.vehicle.findUnique({
    where: { id: targetVehicleId },
    include: {
      user: true,
      subscriptions: {
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.OVERDUE] },
        },
      },
    },
  });

  return { existingSub, targetVehicle };
}

export async function transferSubscriptionAction(
  _prevState: SubscriptionActionResult | null,
  formData: FormData
): Promise<SubscriptionActionResult> {
  const parsed = parseTransferFormData(formData);
  const validationResult = validateTransferSubscription(parsed);
  if (!validationResult.success) {
    return subscriptionFailure(undefined, validationResult.errors);
  }

  const { subscriptionId, targetVehicleId } = validationResult.data;
  const { existingSub, targetVehicle } = await findTransferEntities(
    subscriptionId,
    targetVehicleId
  );

  if (!existingSub) return subscriptionFailure('Subscription pass not found.');
  if (!targetVehicle || targetVehicle.deletedAt) {
    return subscriptionFailure('Target vehicle not found.');
  }

  const eligibility = evaluateTransferEligibility({
    sourceVehicle: existingSub.vehicle,
    targetVehicle,
    sourceSubscription: existingSub,
    targetVehicleSubscriptions: targetVehicle.subscriptions,
  });

  if (!eligibility.eligible) {
    return subscriptionFailure(TRANSFER_REJECTION_MESSAGES[eligibility.reason]);
  }

  const operator = await getAuthenticatedOperator();

  try {
    await persistTransferredSubscription(existingSub, targetVehicle, operator);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleSubscriptionError('transferSubscriptionAction', error, existingSub.vehicle.userId);
  }
}
