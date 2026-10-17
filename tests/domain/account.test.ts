import { describe, it, expect } from 'vitest';
import { UserStatus, SubscriptionStatus } from '@prisma/client';
import {
  validateUpdateAccount,
  evaluateAccountDeactivationEligibility,
  evaluateAccountReactivationEligibility,
  canDeactivateAccount,
  canReactivateAccount,
  deactivateAccount,
  reactivateAccount,
  validateDeactivateAccount,
  validateReactivateAccount,
  shouldRestoreActiveAccountStatus,
  DEACTIVATE_ACCOUNT_REJECTION_MESSAGES,
  REACTIVATE_ACCOUNT_REJECTION_MESSAGES,
  ACCOUNT_INVARIANT_ERRORS,
  type DeactivateAccountRejectionReason,
  type ReactivateAccountRejectionReason,
} from '../../lib/domain/account';

describe('validateUpdateAccount domain logic', () => {
  const validInput = {
    userId: 'user-123',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '(555) 234-5678',
  };

  it('validates and sanitizes standard valid inputs', () => {
    const result = validateUpdateAccount({
      userId: 'user-123',
      name: '  Jane Doe  ',
      email: '  JANE.DOE@EXAMPLE.COM ',
      phone: ' (555) 234-5678 ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe');
      expect(result.data.email).toBe('jane.doe@example.com');
      expect(result.data.phone).toBe('(555) 234-5678');
    }
  });

  it('accepts international phone numbers prefixed with +', () => {
    const result = validateUpdateAccount({
      ...validInput,
      phone: '+44 20 7946 0958',
    });

    expect(result.success).toBe(true);
  });

  it('fails when userId is missing or empty', () => {
    const result = validateUpdateAccount({
      ...validInput,
      userId: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.userId).toBeDefined();
    }
  });

  it('accepts single-character legal names', () => {
    const result = validateUpdateAccount({
      ...validInput,
      name: 'U',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('U');
    }
  });

  it('fails when name is empty or only whitespace', () => {
    const result = validateUpdateAccount({
      ...validInput,
      name: '   ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toContain('Name is required');
    }
  });

  it('fails when email is invalid', () => {
    const result = validateUpdateAccount({
      ...validInput,
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeDefined();
    }
  });

  it('fails when phone has letters or invalid characters', () => {
    const result = validateUpdateAccount({
      ...validInput,
      phone: '555-CALL-ME',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.phone).toBeDefined();
    }
  });

  it('fails when phone has fewer than 7 digits', () => {
    const result = validateUpdateAccount({
      ...validInput,
      phone: '12345',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.phone).toBeDefined();
    }
  });

  it('accepts phone numbers up to 26 characters', () => {
    const result = validateUpdateAccount({
      ...validInput,
      phone: '+1 (555) 012-3456-7890-123',
    });

    expect(result.success).toBe(true);
  });

  it('fails when phone number exceeds 26 characters', () => {
    const result = validateUpdateAccount({
      ...validInput,
      phone: '+1 (555) 012-3456-7890-1234',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.phone).toContain('cannot exceed 26 characters');
    }
  });

  it('handles completely non-object input gracefully', () => {
    const result = validateUpdateAccount(null);
    expect(result.success).toBe(false);
  });
});

describe('account message dictionaries', () => {
  it('exhaustively defines non-empty string messages for all deactivation reasons', () => {
    const reasons: DeactivateAccountRejectionReason[] = ['ALREADY_INACTIVE'];
    for (const reason of reasons) {
      expect(typeof DEACTIVATE_ACCOUNT_REJECTION_MESSAGES[reason]).toBe('string');
      expect(DEACTIVATE_ACCOUNT_REJECTION_MESSAGES[reason].length).toBeGreaterThan(0);
    }
  });

  it('exhaustively defines non-empty string messages for all reactivation reasons', () => {
    const reasons: ReactivateAccountRejectionReason[] = ['ALREADY_ACTIVE', 'ACCOUNT_OVERDUE'];
    for (const reason of reasons) {
      expect(typeof REACTIVATE_ACCOUNT_REJECTION_MESSAGES[reason]).toBe('string');
      expect(REACTIVATE_ACCOUNT_REJECTION_MESSAGES[reason].length).toBeGreaterThan(0);
    }
  });

  it('defines non-empty invariant error messages', () => {
    expect(ACCOUNT_INVARIANT_ERRORS.CANNOT_DEACTIVATE_INACTIVE.length).toBeGreaterThan(0);
    expect(ACCOUNT_INVARIANT_ERRORS.CANNOT_REACTIVATE_ACTIVE.length).toBeGreaterThan(0);
  });
});

describe('evaluateAccountDeactivationEligibility', () => {
  it('returns eligible when customer status is ACTIVE', () => {
    const result = evaluateAccountDeactivationEligibility({ status: UserStatus.ACTIVE });
    expect(result).toEqual({ eligible: true });
    expect('message' in result).toBe(false);
  });

  it('returns eligible when customer status is OVERDUE', () => {
    const result = evaluateAccountDeactivationEligibility({ status: UserStatus.OVERDUE });
    expect(result).toEqual({ eligible: true });
    expect('message' in result).toBe(false);
  });

  it('rejects with ALREADY_INACTIVE when customer is already INACTIVE', () => {
    const result = evaluateAccountDeactivationEligibility({ status: UserStatus.INACTIVE });
    expect(result).toEqual({ eligible: false, reason: 'ALREADY_INACTIVE' });
    expect('message' in result).toBe(false);
  });
});

describe('evaluateAccountReactivationEligibility', () => {
  it('returns eligible when customer status is INACTIVE', () => {
    const result = evaluateAccountReactivationEligibility({ status: UserStatus.INACTIVE });
    expect(result).toEqual({ eligible: true });
    expect('message' in result).toBe(false);
  });

  it('rejects with ACCOUNT_OVERDUE when customer status is OVERDUE', () => {
    const result = evaluateAccountReactivationEligibility({ status: UserStatus.OVERDUE });
    expect(result).toEqual({ eligible: false, reason: 'ACCOUNT_OVERDUE' });
    expect('message' in result).toBe(false);
  });

  it('rejects with ALREADY_ACTIVE when customer is already ACTIVE', () => {
    const result = evaluateAccountReactivationEligibility({ status: UserStatus.ACTIVE });
    expect(result).toEqual({ eligible: false, reason: 'ALREADY_ACTIVE' });
    expect('message' in result).toBe(false);
  });
});

describe('canDeactivateAccount', () => {
  it('returns true when customer is ACTIVE', () => {
    expect(canDeactivateAccount(UserStatus.ACTIVE)).toBe(true);
  });

  it('returns true when customer is OVERDUE', () => {
    expect(canDeactivateAccount(UserStatus.OVERDUE)).toBe(true);
  });

  it('returns false when customer is already INACTIVE', () => {
    expect(canDeactivateAccount(UserStatus.INACTIVE)).toBe(false);
  });
});

describe('canReactivateAccount', () => {
  it('returns true when customer is INACTIVE', () => {
    expect(canReactivateAccount(UserStatus.INACTIVE)).toBe(true);
  });

  it('returns false when customer is ACTIVE', () => {
    expect(canReactivateAccount(UserStatus.ACTIVE)).toBe(false);
  });

  it('returns false when customer is OVERDUE', () => {
    expect(canReactivateAccount(UserStatus.OVERDUE)).toBe(false);
  });
});

describe('deactivateAccount state transition', () => {
  it('cascades cancellation to active and overdue passes while leaving cancelled passes alone', () => {
    const customer = { id: 'cust-1', status: UserStatus.ACTIVE };
    const subscriptions = [
      { id: 'sub-1', status: SubscriptionStatus.ACTIVE },
      { id: 'sub-2', status: SubscriptionStatus.OVERDUE },
      { id: 'sub-3', status: SubscriptionStatus.CANCELLED },
    ];

    const result = deactivateAccount(customer, subscriptions);
    expect(result.user.status).toBe(UserStatus.INACTIVE);
    expect(result.user.id).toBe('cust-1');
    expect(result.cancelledSubscriptionIds).toEqual(['sub-1', 'sub-2']);
    expect(result.cancelledSubscriptions).toEqual([
      { id: 'sub-1', status: SubscriptionStatus.CANCELLED },
      { id: 'sub-2', status: SubscriptionStatus.CANCELLED },
    ]);
  });

  it('handles customer with no subscriptions gracefully', () => {
    const customer = { id: 'cust-2', status: UserStatus.OVERDUE };
    const result = deactivateAccount(customer);
    expect(result.user.status).toBe(UserStatus.INACTIVE);
    expect(result.cancelledSubscriptionIds).toEqual([]);
    expect(result.cancelledSubscriptions).toEqual([]);
  });

  it('throws invariant error when attempting to deactivate an already INACTIVE customer', () => {
    const customer = { id: 'cust-3', status: UserStatus.INACTIVE };
    expect(() => deactivateAccount(customer, [])).toThrow(
      ACCOUNT_INVARIANT_ERRORS.CANNOT_DEACTIVATE_INACTIVE
    );
  });
});

describe('reactivateAccount state transition', () => {
  it('transitions an INACTIVE customer to ACTIVE', () => {
    const customer = { id: 'cust-1', name: 'User One', status: UserStatus.INACTIVE };
    const result = reactivateAccount(customer);
    expect(result.status).toBe(UserStatus.ACTIVE);
    expect(result.id).toBe('cust-1');
    expect(result.name).toBe('User One');
  });

  it('throws invariant error when customer is OVERDUE', () => {
    const customer = { id: 'cust-2', name: 'User Two', status: UserStatus.OVERDUE };
    expect(() => reactivateAccount(customer)).toThrow(
      ACCOUNT_INVARIANT_ERRORS.CANNOT_REACTIVATE_OVERDUE
    );
  });

  it('throws invariant error when customer is already ACTIVE', () => {
    const customer = { id: 'cust-3', status: UserStatus.ACTIVE };
    expect(() => reactivateAccount(customer)).toThrow(
      ACCOUNT_INVARIANT_ERRORS.CANNOT_REACTIVATE_ACTIVE
    );
  });
});

describe('validateDeactivateAccount', () => {
  it('validates valid input without reason', () => {
    const result = validateDeactivateAccount({ userId: 'cust-1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe('cust-1');
    }
  });

  it('validates valid input with trimmed reason', () => {
    const result = validateDeactivateAccount({
      userId: 'cust-1',
      reason: '  Customer moving away  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('Customer moving away');
    }
  });

  it('fails when userId is blank or missing', () => {
    const result = validateDeactivateAccount({ userId: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.userId).toContain('User ID is required');
    }
  });

  it('fails when reason exceeds 500 characters', () => {
    const result = validateDeactivateAccount({
      userId: 'cust-1',
      reason: 'X'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.reason).toContain('cannot exceed 500 characters');
    }
  });

  it('handles non-object input gracefully', () => {
    const result = validateDeactivateAccount(null);
    expect(result.success).toBe(false);
  });
});

describe('validateReactivateAccount', () => {
  it('validates valid input with trimmed userId', () => {
    const result = validateReactivateAccount({ userId: '  cust-1  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe('cust-1');
    }
  });

  it('validates valid input with trimmed reason', () => {
    const result = validateReactivateAccount({
      userId: 'cust-1',
      reason: '  Customer dispute resolved  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('Customer dispute resolved');
    }
  });

  it('fails when userId is blank', () => {
    const result = validateReactivateAccount({ userId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.userId).toContain('User ID is required');
    }
  });

  it('fails when reason exceeds 500 characters', () => {
    const result = validateReactivateAccount({
      userId: 'cust-1',
      reason: 'X'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.reason).toContain('cannot exceed 500 characters');
    }
  });

  it('handles non-object input gracefully', () => {
    const result = validateReactivateAccount(null);
    expect(result.success).toBe(false);
  });
});

describe('shouldRestoreActiveAccountStatus domain logic', () => {
  it('returns true when user is OVERDUE and remaining overdue subscriptions count is 0', () => {
    expect(
      shouldRestoreActiveAccountStatus({
        currentStatus: UserStatus.OVERDUE,
        remainingOverdueSubscriptionsCount: 0,
      })
    ).toBe(true);
  });

  it('returns false when user is OVERDUE but has remaining overdue subscriptions', () => {
    expect(
      shouldRestoreActiveAccountStatus({
        currentStatus: UserStatus.OVERDUE,
        remainingOverdueSubscriptionsCount: 1,
      })
    ).toBe(false);
  });

  it('returns false when user is not OVERDUE', () => {
    expect(
      shouldRestoreActiveAccountStatus({
        currentStatus: UserStatus.ACTIVE,
        remainingOverdueSubscriptionsCount: 0,
      })
    ).toBe(false);

    expect(
      shouldRestoreActiveAccountStatus({
        currentStatus: UserStatus.INACTIVE,
        remainingOverdueSubscriptionsCount: 0,
      })
    ).toBe(false);
  });
});
