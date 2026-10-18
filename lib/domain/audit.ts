import {
  OperatorRole,
  AuditAction,
} from '@prisma/client';

export { OperatorRole, AuditAction };

export interface CsrOperator {
  id: string;
  name: string;
  role: OperatorRole;
  email?: string;
}

export interface AuditEvent {
  id: string;
  operatorId: string;
  operatorName: string;
  operatorRole: OperatorRole;
  action: AuditAction;
  targetUserId: string;
  targetCustomerName?: string;
  details?: string;
  timestamp: string; // ISO string for deterministic serialization
}

export interface CreateAuditParams {
  operator: CsrOperator;
  action: AuditAction;
  targetUserId: string;
  targetCustomerName?: string;
  details?: string;
}

export const AUDIT_DESCRIPTIONS = {
  VIEW_CUSTOMER_360: (params: { customerName: string }) =>
    `Viewed Customer 360 overview for ${params.customerName}`,
  UPDATE_ACCOUNT: (params: { name: string; email: string; phone: string }) =>
    `Updated customer account details: name="${params.name}", email="${params.email}", phone="${params.phone}"`,
  DEACTIVATE_ACCOUNT: (params: { cascadedCount: number; reason?: string }) =>
    `Deactivated customer account. Cascaded cancellation to ${params.cascadedCount} pass(es). Revoked automated RFID gate access.${params.reason ? ` Reason: ${params.reason}` : ''}`,
  REACTIVATE_ACCOUNT: (params?: { reason?: string }) =>
    `Reactivated customer account to ACTIVE status.${params?.reason ? ` Reason: ${params.reason}` : ''}`,
  ADD_VEHICLE: (params: { plate: string; year: number; make: string; model: string; color: string }) =>
    `Added vehicle: plate="${params.plate}", ${params.year} ${params.make} ${params.model} (${params.color})`,
  REMOVE_VEHICLE: (params: { plate: string; year: number; make: string; model: string }) =>
    `Removed vehicle: plate="${params.plate}", ${params.year} ${params.make} ${params.model}`,
  SUBSCRIBE_VEHICLE: (params: { planName: string; plate: string; year: number; make: string; model: string }) =>
    `Attached membership plan "${params.planName}" to vehicle ${params.plate} (${params.year} ${params.make} ${params.model})`,
  TRANSFER_SUBSCRIPTION: (params: { planName: string; fromPlate: string; toPlate: string }) =>
    `Transferred "${params.planName}" membership from vehicle ${params.fromPlate} to ${params.toPlate}`,
  CANCEL_SUBSCRIPTION: (params: { planName: string; plate: string; reason?: string }) =>
    `Cancelled pass "${params.planName}" on vehicle ${params.plate}${params.reason ? `. Reason: ${params.reason}` : ''}`,
  RESOLVE_OVERDUE_PAYMENT: (params: { formattedAmount: string; description: string }) =>
    `Resolved overdue payment (${params.formattedAmount}). Restored RFID gate access. ${params.description}`,
} as const;

export const AUDIT_INVARIANT_ERRORS = {
  REQUIRES_OPERATOR: 'Audit event requires a valid CSR operator identity.',
  REQUIRES_ACTION: 'Audit event requires an action type.',
  REQUIRES_TARGET_USER: 'Audit event requires a target customer userId.',
} as const;

/**
 * Builds an audit log event capturing operator attribution and outcome.
 * Requires a CSR operator identity.
 */
export function createAuditEvent(params: CreateAuditParams): AuditEvent {
  if (!params.operator || !params.operator.id || !params.operator.name) {
    throw new Error(AUDIT_INVARIANT_ERRORS.REQUIRES_OPERATOR);
  }
  if (!params.action) {
    throw new Error(AUDIT_INVARIANT_ERRORS.REQUIRES_ACTION);
  }
  if (!params.targetUserId || params.targetUserId.trim() === '') {
    throw new Error(AUDIT_INVARIANT_ERRORS.REQUIRES_TARGET_USER);
  }

  return {
    id: crypto.randomUUID(),
    operatorId: params.operator.id,
    operatorName: params.operator.name,
    operatorRole: params.operator.role,
    action: params.action,
    targetUserId: params.targetUserId.trim(),
    targetCustomerName: params.targetCustomerName,
    details: params.details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Maps an immutable AuditEvent to a Prisma AuditLog creation payload.
 */
export function toAuditLogData(event: AuditEvent) {
  return {
    id: event.id,
    operatorId: event.operatorId,
    operatorName: event.operatorName,
    operatorRole: event.operatorRole,
    action: event.action,
    targetUserId: event.targetUserId,
    targetCustomerName: event.targetCustomerName ?? null,
    details: event.details ?? null,
    createdAt: new Date(event.timestamp),
  };
}

/**
 * Default number of audit log records displayed per page.
 */
export const DEFAULT_AUDIT_PAGE_SIZE = 10;
