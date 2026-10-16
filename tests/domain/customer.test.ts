import { describe, it, expect } from 'vitest';
import { UserStatus } from '@prisma/client';
import {
  isWashAccessSuspended,
  toDirectoryCustomer,
  extractPaginatedItems,
  type RawCustomerDirectoryItem,
} from '../../lib/domain/customer';

describe('customer domain rules', () => {
  describe('isWashAccessSuspended', () => {
    it('returns false for ACTIVE customers', () => {
      expect(isWashAccessSuspended(UserStatus.ACTIVE)).toBe(false);
    });

    it('returns true for OVERDUE customers', () => {
      expect(isWashAccessSuspended(UserStatus.OVERDUE)).toBe(true);
    });

    it('returns true for INACTIVE customers', () => {
      expect(isWashAccessSuspended(UserStatus.INACTIVE)).toBe(true);
    });
  });

  describe('toDirectoryCustomer', () => {
    it('projects a raw user into a safe directory item with masked email, masked phone, and vehicle count', () => {
      const rawUser: RawCustomerDirectoryItem = {
        id: 'cust-123',
        name: 'Jordan Blake',
        status: UserStatus.OVERDUE,
        email: 'jordan.blake@example.com',
        phone: '(555) 234-5678',
        _count: { vehicles: 2 },
      };

      const result = toDirectoryCustomer(rawUser);

      expect(result).toEqual({
        id: 'cust-123',
        name: 'Jordan Blake',
        status: UserStatus.OVERDUE,
        maskedEmail: 'j***e@example.com',
        maskedPhone: '•••• •••• 5678',
        vehicleCount: 2,
      });

      // Assert plaintext does not leak
      expect('email' in result).toBe(false);
      expect('phone' in result).toBe(false);
    });

    it('uses _count.vehicles when mapping vehicle count', () => {
      const rawUser: RawCustomerDirectoryItem = {
        id: 'cust-456',
        name: 'Alex Morgan',
        status: UserStatus.ACTIVE,
        email: 'alex.m@example.com',
        phone: '5551234567',
        _count: { vehicles: 3 },
      };

      const result = toDirectoryCustomer(rawUser);
      expect(result.vehicleCount).toBe(3);
    });

    it('correctly maps zero vehicles count', () => {
      const rawUser: RawCustomerDirectoryItem = {
        id: 'cust-789',
        name: 'Taylor Swift',
        status: UserStatus.ACTIVE,
        email: 'taylor@example.com',
        phone: '5559876543',
        _count: { vehicles: 0 },
      };

      const result = toDirectoryCustomer(rawUser);
      expect(result.vehicleCount).toBe(0);
    });
  });

  describe('extractPaginatedItems', () => {
    it('returns all items and hasMore false when records are fewer than pageSize', () => {
      const records = [{ id: 'user-1' }, { id: 'user-2' }];
      const result = extractPaginatedItems(records, 5);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('returns all items and hasMore false when records equal pageSize', () => {
      const records = [{ id: 'user-1' }, { id: 'user-2' }];
      const result = extractPaginatedItems(records, 2);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('slices items, sets nextCursor, and flags hasMore true when records exceed pageSize', () => {
      const records = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];
      const result = extractPaginatedItems(records, 2);

      expect(result.items).toHaveLength(2);
      expect(result.items[1].id).toBe('user-2');
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('user-2');
    });

    it('handles empty input gracefully', () => {
      const result = extractPaginatedItems([]);

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });
});

