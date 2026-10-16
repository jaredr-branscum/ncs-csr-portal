import { UserStatus } from '@prisma/client';
import { maskEmail, maskPhone } from '../utils/mask';

export interface BaseCustomer {
  id: string;
  name: string;
  status: UserStatus;
}

export interface RawCustomerDirectoryItem extends BaseCustomer {
  email: string;
  phone: string;
  _count: { vehicles: number };
}

export interface DirectoryCustomer extends BaseCustomer {
  maskedEmail: string;
  maskedPhone: string;
  vehicleCount: number;
}

/**
 * Determines whether a customer's vehicle wash gate access is suspended.
 * Overdue or deactivated accounts are barred from automated RFID entry.
 */
export function isWashAccessSuspended(status: UserStatus): boolean {
  return status === UserStatus.OVERDUE || status === UserStatus.INACTIVE;
}

/**
 * Projects a raw customer database record into a safe, PII-masked directory item.
 * Guarantees that bulk customer listings never transmit unmasked email or phone to the client.
 */
export function toDirectoryCustomer(user: RawCustomerDirectoryItem): DirectoryCustomer {
  return {
    id: user.id,
    name: user.name,
    status: user.status,
    maskedEmail: maskEmail(user.email),
    maskedPhone: maskPhone(user.phone),
    vehicleCount: user._count.vehicles,
  };
}

export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Slices records by pageSize and calculating next cursor.
 */
export function extractPaginatedItems<T extends { id: string }>(
  records: T[],
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginationResult<T> {
  const hasMore = records.length > pageSize;
  const items = hasMore ? records.slice(0, pageSize) : records;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  return {
    items,
    nextCursor,
    hasMore,
  };
}

