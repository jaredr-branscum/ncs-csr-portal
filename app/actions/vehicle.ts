'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  validateAddVehicle,
  validateRemoveVehicle,
  evaluateVehicleRemovalEligibility,
  VEHICLE_REMOVAL_REJECTION_MESSAGES,
  type AddVehicleInput,
} from '@/lib/domain/vehicle';
import {
  createAuditEvent,
  toAuditLogData,
  AuditAction,
  type AuditEvent,
  type CsrOperator,
} from '@/lib/domain/audit';
import { getAuthenticatedOperator } from '@/lib/auth/session';

const VEHICLE_ACTION_MESSAGES = {
  NOT_FOUND: 'Vehicle record not found.',
  DUPLICATE_PLATE: 'This vehicle license plate is already registered to this customer.',
  DUPLICATE_GLOBAL_PLATE:
    'This vehicle license plate is already registered to another customer in the system.',
  UNEXPECTED_ERROR: 'Failed to process vehicle request. Please try again or contact engineering.',
} as const;

import type { ActionResult } from '@/lib/types/action';

export type VehicleActionResult = ActionResult;

function vehicleFailure(
  formError?: string,
  fieldErrors?: Record<string, string>
): VehicleActionResult {
  return {
    success: false,
    formError,
    fieldErrors,
  };
}

function parseVehicleFormData(formData: FormData) {
  return {
    userId: formData.get('userId')?.toString() ?? '',
    licensePlate: formData.get('licensePlate')?.toString() ?? '',
    make: formData.get('make')?.toString() ?? '',
    model: formData.get('model')?.toString() ?? '',
    year: formData.get('year')?.toString() ?? '',
    color: formData.get('color')?.toString() ?? '',
  };
}

function handleVehicleError(error: unknown, userId: string): VehicleActionResult {
  if (
    error instanceof Error &&
    (error.message === VEHICLE_ACTION_MESSAGES.DUPLICATE_PLATE ||
      error.message === VEHICLE_ACTION_MESSAGES.DUPLICATE_GLOBAL_PLATE)
  ) {
    return vehicleFailure(undefined, { licensePlate: error.message });
  }

  console.error('[vehicleAction] Unexpected failure:', {
    targetUserId: userId,
    error,
  });

  return vehicleFailure(VEHICLE_ACTION_MESSAGES.UNEXPECTED_ERROR);
}

async function persistAddedVehicle(
  data: AddVehicleInput,
  auditEvent: AuditEvent
) {
  await prisma.$transaction(async (tx) => {
    const existingGlobal = await tx.vehicle.findFirst({
      where: {
        licensePlate: data.licensePlate,
        deletedAt: null,
      },
      select: { userId: true },
    });
    if (existingGlobal) {
      const isSameUser = existingGlobal.userId === data.userId;
      throw new Error(
        isSameUser
          ? VEHICLE_ACTION_MESSAGES.DUPLICATE_PLATE
          : VEHICLE_ACTION_MESSAGES.DUPLICATE_GLOBAL_PLATE
      );
    }

    await tx.vehicle.create({
      data: {
        userId: data.userId,
        licensePlate: data.licensePlate,
        make: data.make,
        model: data.model,
        year: data.year,
        color: data.color,
      },
    });
    await tx.auditLog.create({ data: toAuditLogData(auditEvent) });
  });
}

export async function addVehicleAction(
  _prevState: VehicleActionResult | null,
  formData: FormData
): Promise<VehicleActionResult> {
  const parsed = parseVehicleFormData(formData);
  const validationResult = validateAddVehicle(parsed);

  if (!validationResult.success) {
    return vehicleFailure(undefined, validationResult.errors);
  }

  const { data } = validationResult;

  const existingActive = await prisma.vehicle.findFirst({
    where: { licensePlate: data.licensePlate, deletedAt: null },
    select: { userId: true },
  });

  if (existingActive) {
    const isSameUser = existingActive.userId === data.userId;
    return vehicleFailure(undefined, {
      licensePlate: isSameUser
        ? VEHICLE_ACTION_MESSAGES.DUPLICATE_PLATE
        : VEHICLE_ACTION_MESSAGES.DUPLICATE_GLOBAL_PLATE,
    });
  }

  const operator = await getAuthenticatedOperator();

  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.ADD_VEHICLE,
    targetUserId: data.userId,
    details: `Added vehicle: plate="${data.licensePlate}", ${data.year} ${data.make} ${data.model} (${data.color})`,
  });

  try {
    await persistAddedVehicle(data, auditEvent);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleVehicleError(error, data.userId);
  }
}

function parseRemoveVehicleFormData(formData: FormData) {
  return {
    vehicleId: formData.get('vehicleId')?.toString() ?? '',
    userId: formData.get('userId')?.toString() ?? '',
  };
}

async function persistRemovedVehicle(
  vehicle: {
    id: string;
    userId: string;
    licensePlate: string;
    make: string;
    model: string;
    year: number;
  },
  operator: CsrOperator
) {
  const auditEvent = createAuditEvent({
    operator,
    action: AuditAction.REMOVE_VEHICLE,
    targetUserId: vehicle.userId,
    details: `Removed vehicle: plate="${vehicle.licensePlate}", ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
  });

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { deletedAt: new Date() },
    });
    await tx.auditLog.create({ data: toAuditLogData(auditEvent) });
  });
}

export async function removeVehicleAction(
  _prevState: VehicleActionResult | null,
  formData: FormData
): Promise<VehicleActionResult> {
  const parsed = parseRemoveVehicleFormData(formData);
  const validationResult = validateRemoveVehicle(parsed);

  if (!validationResult.success) {
    return vehicleFailure(undefined, validationResult.errors);
  }

  const { vehicleId, userId } = validationResult.data;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      subscriptions: true,
    },
  });

  if (!vehicle) {
    return vehicleFailure(VEHICLE_ACTION_MESSAGES.NOT_FOUND);
  }

  const eligibility = evaluateVehicleRemovalEligibility({
    vehicle,
    requestingUserId: userId,
  });

  if (!eligibility.eligible) {
    return vehicleFailure(VEHICLE_REMOVAL_REJECTION_MESSAGES[eligibility.reason]);
  }

  const operator = await getAuthenticatedOperator();

  try {
    await persistRemovedVehicle(vehicle, operator);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleVehicleError(error, userId);
  }
}
