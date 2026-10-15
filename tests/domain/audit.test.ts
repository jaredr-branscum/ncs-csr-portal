import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createAuditEvent,
  toAuditLogData,
  AUDIT_DESCRIPTIONS,
  AUDIT_INVARIANT_ERRORS,
  OperatorRole,
  AuditAction,
  type CsrOperator,
} from '../../lib/domain/audit';

describe('CSR operator session & audit domain', () => {
  const testOperator: CsrOperator = {
    id: 'op-101',
    name: 'Operator 101',
    role: OperatorRole.SUPPORT_REP,
    email: 'op-101@internal.domain',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T03:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createAuditEvent', () => {
    it('builds a valid audit event with all attributes', () => {
      const event = createAuditEvent({
        operator: testOperator,
        action: AuditAction.VIEW_CUSTOMER_360,
        targetUserId: 'user-100',
        targetCustomerName: 'Customer Alpha',
        details: 'Opened Customer 360 Workspace',
      });

      expect(event).toEqual({
        id: expect.any(String),
        operatorId: 'op-101',
        operatorName: 'Operator 101',
        operatorRole: OperatorRole.SUPPORT_REP,
        action: AuditAction.VIEW_CUSTOMER_360,
        targetUserId: 'user-100',
        targetCustomerName: 'Customer Alpha',
        details: 'Opened Customer 360 Workspace',
        timestamp: '2026-10-14T03:00:00.000Z',
      });
      expect(event.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('throws error when operator is missing, null, or has empty id/name', () => {
      expect(() =>
        createAuditEvent({
          operator: undefined as unknown as CsrOperator,
          action: AuditAction.VIEW_CUSTOMER_360,
          targetUserId: 'user-100',
        })
      ).toThrow(AUDIT_INVARIANT_ERRORS.REQUIRES_OPERATOR);

      expect(() =>
        createAuditEvent({
          operator: { id: '', name: 'Test', role: OperatorRole.SUPPORT_REP },
          action: AuditAction.VIEW_CUSTOMER_360,
          targetUserId: 'user-100',
        })
      ).toThrow(AUDIT_INVARIANT_ERRORS.REQUIRES_OPERATOR);

      expect(() =>
        createAuditEvent({
          operator: { id: 'op-1', name: '', role: OperatorRole.SUPPORT_REP },
          action: AuditAction.VIEW_CUSTOMER_360,
          targetUserId: 'user-100',
        })
      ).toThrow(AUDIT_INVARIANT_ERRORS.REQUIRES_OPERATOR);
    });

    it('throws error when action type is missing', () => {
      expect(() =>
        createAuditEvent({
          operator: testOperator,
          action: '' as unknown as AuditAction,
          targetUserId: 'user-100',
        })
      ).toThrow(AUDIT_INVARIANT_ERRORS.REQUIRES_ACTION);
    });

    it('throws error when targetUserId is missing or empty whitespace', () => {
      expect(() =>
        createAuditEvent({
          operator: testOperator,
          action: AuditAction.VIEW_CUSTOMER_360,
          targetUserId: '',
        })
      ).toThrow(AUDIT_INVARIANT_ERRORS.REQUIRES_TARGET_USER);

      expect(() =>
        createAuditEvent({
          operator: testOperator,
          action: AuditAction.VIEW_CUSTOMER_360,
          targetUserId: '   ',
        })
      ).toThrow(AUDIT_INVARIANT_ERRORS.REQUIRES_TARGET_USER);
    });
  });

  describe('toAuditLogData mapper', () => {
    it('maps an AuditEvent to a Prisma AuditLog creation payload with converted Date', () => {
      const event = createAuditEvent({
        operator: {
          id: 'op-202',
          name: 'Operator 202',
          role: OperatorRole.SUPPORT_REP,
        },
        action: AuditAction.UPDATE_ACCOUNT,
        targetUserId: 'user-100',
        targetCustomerName: 'Customer Alpha',
        details: 'Updated account details',
      });

      const prismaData = toAuditLogData(event);
      expect(prismaData).toEqual({
        id: event.id,
        operatorId: 'op-202',
        operatorName: 'Operator 202',
        operatorRole: OperatorRole.SUPPORT_REP,
        action: AuditAction.UPDATE_ACCOUNT,
        targetUserId: 'user-100',
        targetCustomerName: 'Customer Alpha',
        details: 'Updated account details',
        createdAt: new Date('2026-10-14T03:00:00.000Z'),
      });
    });

    it('handles nullish optional fields gracefully', () => {
      const event = createAuditEvent({
        operator: testOperator,
        action: AuditAction.UPDATE_ACCOUNT,
        targetUserId: 'user-100',
      });

      const prismaData = toAuditLogData(event);
      expect(prismaData.targetCustomerName).toBeNull();
      expect(prismaData.details).toBeNull();
    });
  });

  describe('AUDIT_DESCRIPTIONS dictionary', () => {
    it('formats all audit descriptions correctly', () => {
      expect(AUDIT_DESCRIPTIONS.VIEW_CUSTOMER_360({ customerName: 'Alice' }))
        .toBe('Viewed Customer 360 overview for Alice');

      expect(
        AUDIT_DESCRIPTIONS.UPDATE_ACCOUNT({ name: 'Bob', email: 'bob@example.com', phone: '555-1234' })
      ).toBe('Updated customer account details: name="Bob", email="bob@example.com", phone="555-1234"');

      expect(AUDIT_DESCRIPTIONS.DEACTIVATE_ACCOUNT({ cascadedCount: 2, reason: 'Customer requested' }))
        .toBe('Deactivated customer account. Cascaded cancellation to 2 pass(es). Revoked automated RFID gate access. Reason: Customer requested');

      expect(AUDIT_DESCRIPTIONS.DEACTIVATE_ACCOUNT({ cascadedCount: 0 }))
        .toBe('Deactivated customer account. Cascaded cancellation to 0 pass(es). Revoked automated RFID gate access.');

      expect(AUDIT_DESCRIPTIONS.REACTIVATE_ACCOUNT())
        .toBe('Reactivated customer account to ACTIVE status.');

      expect(AUDIT_DESCRIPTIONS.REACTIVATE_ACCOUNT({ reason: 'Customer returned' }))
        .toBe('Reactivated customer account to ACTIVE status. Reason: Customer returned');

      expect(
        AUDIT_DESCRIPTIONS.ADD_VEHICLE({ plate: 'TEST-1', year: 2024, make: 'Make', model: 'Model', color: 'Blue' })
      ).toBe('Added vehicle: plate="TEST-1", 2024 Make Model (Blue)');

      expect(
        AUDIT_DESCRIPTIONS.REMOVE_VEHICLE({ plate: 'TEST-1', year: 2024, make: 'Make', model: 'Model' })
      ).toBe('Removed vehicle: plate="TEST-1", 2024 Make Model');

      expect(
        AUDIT_DESCRIPTIONS.SUBSCRIBE_VEHICLE({ planName: 'Gold', plate: 'TEST-1', year: 2024, make: 'Make', model: 'Model' })
      ).toBe('Attached membership plan "Gold" to vehicle TEST-1 (2024 Make Model)');

      expect(
        AUDIT_DESCRIPTIONS.TRANSFER_SUBSCRIPTION({ planName: 'Gold', fromPlate: 'PLATE-A', toPlate: 'PLATE-B' })
      ).toBe('Transferred "Gold" membership from vehicle PLATE-A to PLATE-B');

      expect(
        AUDIT_DESCRIPTIONS.CANCEL_SUBSCRIPTION({ planName: 'Gold', plate: 'PLATE-A', reason: 'Sold car' })
      ).toBe('Cancelled pass "Gold" on vehicle PLATE-A. Reason: Sold car');

      expect(
        AUDIT_DESCRIPTIONS.CANCEL_SUBSCRIPTION({ planName: 'Gold', plate: 'PLATE-A' })
      ).toBe('Cancelled pass "Gold" on vehicle PLATE-A');

      expect(
        AUDIT_DESCRIPTIONS.RESOLVE_OVERDUE_PAYMENT({ formattedAmount: '$34.99', description: 'Overdue charge' })
      ).toBe('Resolved overdue payment ($34.99). Restored RFID gate access. Overdue charge');
    });
  });
});
