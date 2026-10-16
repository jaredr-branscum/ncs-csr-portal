import { connection } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSearchWhereClause } from '@/lib/domain/search';
import { CustomerList } from '@/components/CustomerList';
import { WorkspacePlaceholder } from '@/components/WorkspacePlaceholder';
import {
  toDirectoryCustomer,
  extractPaginatedItems,
  DEFAULT_PAGE_SIZE,
} from '@/lib/domain/customer';
import type { Prisma } from '@prisma/client';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    userId?: string;
  }>;
}

async function fetchDirectoryData(where: Prisma.UserWhereInput) {
  const [rawUsers, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        _count: {
          select: { vehicles: { where: { deletedAt: null } } },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: DEFAULT_PAGE_SIZE + 1,
    }),
    prisma.user.count({ where }),
  ]);

  const { items, nextCursor, hasMore } = extractPaginatedItems(rawUsers, DEFAULT_PAGE_SIZE);
  return {
    directoryUsers: items.map(toDirectoryCustomer),
    totalCount,
    nextCursor,
    hasMore,
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  await connection();
  const { q, userId } = await searchParams;
  const where = buildSearchWhereClause(q);
  const data = await fetchDirectoryData(where);

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 h-full overflow-hidden">
      <div className="md:col-span-4 lg:col-span-4 xl:col-span-3 h-full min-h-0 overflow-hidden">
        <CustomerList
          initialUsers={data.directoryUsers}
          totalCount={data.totalCount}
          initialNextCursor={data.nextCursor}
          initialHasMore={data.hasMore}
          currentQuery={q}
          selectedUserId={userId}
        />
      </div>

      <div className="hidden md:block md:col-span-8 lg:col-span-8 xl:col-span-9 h-full min-h-0 overflow-y-auto bg-slate-50">
        <WorkspacePlaceholder />
      </div>
    </div>
  );
}
