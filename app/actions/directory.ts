'use server';

import { prisma } from '@/lib/prisma';
import { buildSearchWhereClause } from '@/lib/domain/search';
import {
  toDirectoryCustomer,
  extractPaginatedItems,
  DEFAULT_PAGE_SIZE,
  type DirectoryCustomer,
} from '@/lib/domain/customer';

export type LoadMoreCustomersResult = {
  success: boolean;
  customers: DirectoryCustomer[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
};

export async function loadMoreCustomersAction(
  cursor: string,
  query?: string
): Promise<LoadMoreCustomersResult> {
  try {
    const where = buildSearchWhereClause(query);
    const rawUsers = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: { vehicles: { where: { deletedAt: null } } },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: DEFAULT_PAGE_SIZE + 1,
      skip: 1,
      cursor: { id: cursor },
    });

    const { items, nextCursor, hasMore } = extractPaginatedItems(rawUsers, DEFAULT_PAGE_SIZE);

    return {
      success: true,
      customers: items.map(toDirectoryCustomer),
      nextCursor,
      hasMore,
    };
  } catch (error) {
    console.error('[loadMoreCustomersAction] Failed to load customers:', error);
    return {
      success: false,
      customers: [],
      nextCursor: null,
      hasMore: false,
      error: 'Failed to load additional customers. Please try again.',
    };
  }
}
