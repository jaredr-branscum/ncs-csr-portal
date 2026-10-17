import { describe, it, expect } from 'vitest';
import { SubscriptionStatus } from '@prisma/client';
import {
  normalizeLicensePlate,
  validateAddVehicle,
  evaluateVehicleRemovalEligibility,
  canRemoveVehicle,
  validateRemoveVehicle,
  VEHICLE_REMOVAL_REJECTION_MESSAGES,
  type VehicleRemovalRejectionReason,
} from '../../lib/domain/vehicle';

describe('vehicle domain logic', () => {
  const currentYear = new Date().getFullYear();

  const validVehicleInput = {
    userId: 'user-123',
    licensePlate: 'ca-7xyz89',
    make: 'Tesla',
    model: 'Model Y',
    year: 2023,
    color: 'Midnight Silver',
  };

  describe('normalizeLicensePlate', () => {
    it('trims, uppercases, and collapses multiple whitespace characters', () => {
      expect(normalizeLicensePlate('  tx-amp01  ')).toBe('TX-AMP01');
      expect(normalizeLicensePlate('ca   7xyz89')).toBe('CA 7XYZ89');
    });
  });

  describe('validateAddVehicle', () => {
    it('validates, sanitizes, and coerces a valid vehicle input', () => {
      const result = validateAddVehicle({
        ...validVehicleInput,
        licensePlate: '  ca-7xyz89  ',
        year: '2023',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.licensePlate).toBe('CA-7XYZ89');
        expect(result.data.year).toBe(2023);
        expect(result.data.make).toBe('Tesla');
        expect(result.data.model).toBe('Model Y');
        expect(result.data.color).toBe('Midnight Silver');
      }
    });

    it('accepts international license plates with umlauts, dots, and slashes', () => {
      const germanResult = validateAddVehicle({
        ...validVehicleInput,
        licensePlate: 'FÜ-AB 123',
      });
      expect(germanResult.success).toBe(true);
      if (germanResult.success) {
        expect(germanResult.data.licensePlate).toBe('FÜ-AB 123');
      }

      const dottedResult = validateAddVehicle({
        ...validVehicleInput,
        licensePlate: 'B.1234/AB',
      });
      expect(dottedResult.success).toBe(true);
    });

    it('fails when userId is missing or empty', () => {
      const result = validateAddVehicle({
        ...validVehicleInput,
        userId: '   ',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.userId).toBeDefined();
      }
    });

    it('fails when licensePlate is missing or empty', () => {
      const result = validateAddVehicle({
        ...validVehicleInput,
        licensePlate: '   ',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.licensePlate).toContain('License plate is required');
      }
    });

    it('accepts license plates up to 20 characters and fails when exceeding 20', () => {
      const maxPlate = validateAddVehicle({
        ...validVehicleInput,
        licensePlate: '12345678901234567890',
      });
      expect(maxPlate.success).toBe(true);

      const tooLong = validateAddVehicle({
        ...validVehicleInput,
        licensePlate: '123456789012345678901',
      });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.errors.licensePlate).toContain('cannot exceed 20 characters');
      }
    });

    it('fails when licensePlate contains special characters', () => {
      const result = validateAddVehicle({
        ...validVehicleInput,
        licensePlate: 'CA#123!',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.licensePlate).toBeDefined();
      }
    });

    it('fails when make or model is missing or empty', () => {
      const emptyMake = validateAddVehicle({ ...validVehicleInput, make: '   ' });
      expect(emptyMake.success).toBe(false);
      if (!emptyMake.success) {
        expect(emptyMake.errors.make).toContain('make is required');
      }

      const emptyModel = validateAddVehicle({ ...validVehicleInput, model: '   ' });
      expect(emptyModel.success).toBe(false);
      if (!emptyModel.success) {
        expect(emptyModel.errors.model).toContain('model is required');
      }
    });

    it('fails when make or model exceeds 50 characters', () => {
      const longMake = validateAddVehicle({ ...validVehicleInput, make: 'A'.repeat(51) });
      expect(longMake.success).toBe(false);

      const longModel = validateAddVehicle({ ...validVehicleInput, model: 'A'.repeat(51) });
      expect(longModel.success).toBe(false);
    });

    it('fails when color is missing or exceeds 30 characters', () => {
      const emptyColor = validateAddVehicle({ ...validVehicleInput, color: '   ' });
      expect(emptyColor.success).toBe(false);

      const longColor = validateAddVehicle({ ...validVehicleInput, color: 'A'.repeat(31) });
      expect(longColor.success).toBe(false);
    });

    it('fails when year is earlier than 1900 or non-integer', () => {
      const tooOld = validateAddVehicle({ ...validVehicleInput, year: 1899 });
      expect(tooOld.success).toBe(false);
      if (!tooOld.success) {
        expect(tooOld.errors.year).toContain('1900 or later');
      }

      const nonInt = validateAddVehicle({ ...validVehicleInput, year: 2022.5 });
      expect(nonInt.success).toBe(false);
    });

    it('fails when year is later than currentYear + 2', () => {
      const futureYear = currentYear + 3;
      const result = validateAddVehicle({ ...validVehicleInput, year: futureYear });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.year).toContain(`cannot be later than ${currentYear + 2}`);
      }
    });

    it('fails when year is not a valid number', () => {
      const result = validateAddVehicle({ ...validVehicleInput, year: 'not-a-number' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.year).toBeDefined();
      }
    });

    it('handles non-object input gracefully', () => {
      const result = validateAddVehicle(null);
      expect(result.success).toBe(false);
    });
  });

  describe('evaluateVehicleRemovalEligibility', () => {
    const defaultVehicle = {
      id: 'veh-1',
      userId: 'user-1',
      subscriptions: [],
    };

    it('returns eligible when vehicle has no subscriptions', () => {
      const result = evaluateVehicleRemovalEligibility({
        vehicle: defaultVehicle,
        requestingUserId: 'user-1',
      });
      expect(result.eligible).toBe(true);
    });

    it('returns eligible when vehicle has only cancelled subscriptions', () => {
      const result = evaluateVehicleRemovalEligibility({
        vehicle: {
          ...defaultVehicle,
          subscriptions: [{ status: SubscriptionStatus.CANCELLED }],
        },
        requestingUserId: 'user-1',
      });
      expect(result.eligible).toBe(true);
    });

    it('handles undefined subscriptions gracefully as eligible', () => {
      const result = evaluateVehicleRemovalEligibility({
        vehicle: {
          id: 'veh-1',
          userId: 'user-1',
        },
        requestingUserId: 'user-1',
      });
      expect(result.eligible).toBe(true);
    });

    it('rejects with BOLA_OWNERSHIP_MISMATCH when requesting user is not vehicle owner', () => {
      const result = evaluateVehicleRemovalEligibility({
        vehicle: defaultVehicle,
        requestingUserId: 'attacker-999',
      });
      expect(result).toEqual({ eligible: false, reason: 'BOLA_OWNERSHIP_MISMATCH' });
      expect('message' in result).toBe(false);
    });

    it('rejects with ALREADY_REMOVED when vehicle is already soft-deleted', () => {
      const result = evaluateVehicleRemovalEligibility({
        vehicle: {
          ...defaultVehicle,
          deletedAt: new Date(),
        },
        requestingUserId: 'user-1',
      });
      expect(result).toEqual({ eligible: false, reason: 'ALREADY_REMOVED' });
      expect('message' in result).toBe(false);
    });

    it('rejects with HAS_ACTIVE_SUBSCRIPTION when vehicle has an active subscription', () => {
      const result = evaluateVehicleRemovalEligibility({
        vehicle: {
          ...defaultVehicle,
          subscriptions: [{ status: SubscriptionStatus.ACTIVE }],
        },
        requestingUserId: 'user-1',
      });
      expect(result).toEqual({ eligible: false, reason: 'HAS_ACTIVE_SUBSCRIPTION' });
      expect('message' in result).toBe(false);
    });

    it('rejects with HAS_OVERDUE_SUBSCRIPTION when vehicle has an overdue subscription', () => {
      const result = evaluateVehicleRemovalEligibility({
        vehicle: {
          ...defaultVehicle,
          subscriptions: [{ status: SubscriptionStatus.OVERDUE }],
        },
        requestingUserId: 'user-1',
      });
      expect(result).toEqual({ eligible: false, reason: 'HAS_OVERDUE_SUBSCRIPTION' });
      expect('message' in result).toBe(false);
    });
  });

  describe('VEHICLE_REMOVAL_REJECTION_MESSAGES dictionary', () => {
    it('exhaustively defines non-empty string messages for all VehicleRemovalRejectionReasons', () => {
      const reasons: VehicleRemovalRejectionReason[] = [
        'BOLA_OWNERSHIP_MISMATCH',
        'ALREADY_REMOVED',
        'HAS_ACTIVE_SUBSCRIPTION',
        'HAS_OVERDUE_SUBSCRIPTION',
      ];
      for (const reason of reasons) {
        expect(typeof VEHICLE_REMOVAL_REJECTION_MESSAGES[reason]).toBe('string');
        expect(VEHICLE_REMOVAL_REJECTION_MESSAGES[reason].length).toBeGreaterThan(0);
      }
    });
  });

  describe('canRemoveVehicle', () => {
    it('returns true when vehicle is eligible for removal', () => {
      expect(
        canRemoveVehicle(
          { id: 'veh-1', userId: 'user-1', subscriptions: [] },
          'user-1'
        )
      ).toBe(true);
    });

    it('returns false when vehicle is not eligible for removal', () => {
      expect(
        canRemoveVehicle(
          { id: 'veh-1', userId: 'user-1', subscriptions: [{ status: SubscriptionStatus.ACTIVE }] },
          'user-1'
        )
      ).toBe(false);
    });
  });

  describe('validateRemoveVehicle', () => {
    it('successfully validates and trims valid vehicleId and userId', () => {
      const result = validateRemoveVehicle({
        vehicleId: '  veh-123  ',
        userId: '  user-456  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicleId).toBe('veh-123');
        expect(result.data.userId).toBe('user-456');
      }
    });

    it('fails when vehicleId is missing or blank', () => {
      const result = validateRemoveVehicle({
        vehicleId: '   ',
        userId: 'user-456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.vehicleId).toContain('Vehicle ID is required');
      }
    });

    it('fails when userId is missing or blank', () => {
      const result = validateRemoveVehicle({
        vehicleId: 'veh-123',
        userId: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.userId).toContain('User ID is required');
      }
    });

    it('handles non-object input gracefully', () => {
      const result = validateRemoveVehicle(undefined);
      expect(result.success).toBe(false);
    });
  });
});
