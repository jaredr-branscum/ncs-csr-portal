'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  createAuditEvent,
  toAuditLogData,
  AuditAction,
  AUDIT_DESCRIPTIONS,
  DEFAULT_AUDIT_PAGE_SIZE,
} from '@/lib/domain/audit';
import { calculateSkipOffset } from '@/lib/utils/pagination';
import { getAuthenticatedOperator } from '@/lib/auth/session';
import type { AuditLog } from '@prisma/client';

export interface CustomerAuditLogResult {
  success: boolean;
  logs: AuditLog[];
  totalCount: number;
  page: number;
  error?: string;
}

const loadAuditPageSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(50).default(DEFAULT_AUDIT_PAGE_SIZE),
});

export async function loadCustomerAuditHistoryAction(
  userId: string,
  page: number = 1,
  pageSize: number = DEFAULT_AUDIT_PAGE_SIZE
): Promise<CustomerAuditLogResult> {
  const parsed = loadAuditPageSchema.safeParse({ userId, page, pageSize });
  if (!parsed.success) {
    return { success: false, logs: [], totalCount: 0, page: 1, error: 'Invalid request parameters.' };
  }

  try {
    const skip = calculateSkipOffset(parsed.data.page, parsed.data.pageSize);
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: { targetUserId: parsed.data.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parsed.data.pageSize,
      }),
      prisma.auditLog.count({
        where: { targetUserId: parsed.data.userId },
      }),
    ]);

    return { success: true, logs, totalCount, page: parsed.data.page };
  } catch (error) {
    console.error('[loadCustomerAuditHistoryAction] Failed to load audit logs:', error);
    return { success: false, logs: [], totalCount: 0, page, error: 'Failed to load audit history.' };
  }
}

const recordViewSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
});

export async function recordCustomerViewAction(
  userId: string,
  customerName: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = recordViewSchema.safeParse({ userId, customerName });
  if (!parsed.success) {
    return { success: false, error: 'Invalid customer parameters.' };
  }

  try {
    const operator = await getAuthenticatedOperator();
    const auditEvent = createAuditEvent({
      operator,
      action: AuditAction.VIEW_CUSTOMER_360,
      targetUserId: parsed.data.userId,
      targetCustomerName: parsed.data.customerName,
      details: AUDIT_DESCRIPTIONS[AuditAction.VIEW_CUSTOMER_360]({
        customerName: parsed.data.customerName,
      }),
    });

    await prisma.auditLog.create({
      data: toAuditLogData(auditEvent),
    });

    return { success: true };
  } catch (error) {
    console.error('[recordCustomerViewAction] Failed to record customer view audit:', error);
    return { success: false, error: 'Failed to record customer view audit.' };
  }
}
