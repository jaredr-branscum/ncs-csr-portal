'use server';

import { prisma } from '@/lib/prisma';
import type { AuditLog } from '@prisma/client';

export interface CustomerAuditLogResult {
  success: boolean;
  logs: AuditLog[];
  error?: string;
}

export async function loadCustomerAuditHistoryAction(
  userId: string
): Promise<CustomerAuditLogResult> {
  if (!userId || userId.trim() === '') {
    return { success: false, logs: [], error: 'User ID is required.' };
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: { targetUserId: userId.trim() },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { success: true, logs };
  } catch (error) {
    console.error('[loadCustomerAuditHistoryAction] Failed to load audit logs:', error);
    return { success: false, logs: [], error: 'Failed to load audit history.' };
  }
}
