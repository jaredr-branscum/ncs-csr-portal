'use server';

import { prisma } from '@/lib/prisma';
import {
  DEFAULT_PURCHASE_PAGE_SIZE,
  calculateSkipOffset,
} from '@/lib/domain/purchase';
import { z } from 'zod';
import type { Purchase } from '@prisma/client';

const loadPurchasePageSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(50).default(DEFAULT_PURCHASE_PAGE_SIZE),
});

export interface LoadPurchasePageResult {
  success: boolean;
  purchases: Purchase[];
  page: number;
  error?: string;
}

export async function loadPurchaseHistoryPageAction(
  userId: string,
  page: number,
  pageSize: number = DEFAULT_PURCHASE_PAGE_SIZE
): Promise<LoadPurchasePageResult> {
  const parsed = loadPurchasePageSchema.safeParse({ userId, page, pageSize });
  if (!parsed.success) {
    return {
      success: false,
      purchases: [],
      page: 1,
      error: 'Invalid request parameters.',
    };
  }

  try {
    const skip = calculateSkipOffset(parsed.data.page, parsed.data.pageSize);
    const purchases = await prisma.purchase.findMany({
      where: { userId: parsed.data.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parsed.data.pageSize,
    });

    return {
      success: true,
      purchases,
      page: parsed.data.page,
    };
  } catch (error) {
    console.error('[loadPurchaseHistoryPageAction] Query error:', error);
    return {
      success: false,
      purchases: [],
      page: parsed.data.page,
      error: 'Failed to load purchase page.',
    };
  }
}
