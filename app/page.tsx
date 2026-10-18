import { connection } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSearchWhereClause } from '@/lib/domain/search';
import { CustomerList } from '@/components/CustomerList';
import { WorkspacePlaceholder } from '@/components/WorkspacePlaceholder';
import { CustomerProfileCard } from '@/components/customer/CustomerProfileCard';
import { OverdueAlertBanner } from '@/components/customer/OverdueAlertBanner';
import { VehicleGarage } from '@/components/customer/VehicleGarage';
import { PurchaseLedger } from '@/components/customer/PurchaseLedger';
import {
  toDirectoryCustomer,
  extractPaginatedItems,
  DEFAULT_PAGE_SIZE,
} from '@/lib/domain/customer';
import { DEFAULT_PURCHASE_PAGE_SIZE } from '@/lib/domain/purchase';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  SubscriptionStatus,
  PurchaseStatus,
  PurchaseType,
  type Plan,
  type Prisma,
} from '@prisma/client';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    userId?: string;
  }>;
}

type SelectedUserRecord = NonNullable<Awaited<ReturnType<typeof fetchSelectedUser>>>;

interface CustomerWorkspaceProps {
  user: SelectedUserRecord;
  currentQuery?: string;
  availablePlans: Plan[];
}

function getOverdueAlertSubscriptions(vehicles: SelectedUserRecord['vehicles']) {
  return vehicles.flatMap((v) =>
    v.subscriptions
      .filter((s) => s.status === SubscriptionStatus.OVERDUE)
      .map((s) => ({
        id: s.id,
        plan: s.plan,
        vehicle: {
          licensePlate: v.licensePlate,
          make: v.make,
          model: v.model,
          year: v.year,
        },
      }))
  );
}

function CustomerWorkspace({ user, currentQuery, availablePlans }: CustomerWorkspaceProps) {
  const backHref = currentQuery ? `/?q=${encodeURIComponent(currentQuery)}` : '/';
  const overdueSubscriptions = getOverdueAlertSubscriptions(user.vehicles);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="md:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customer Directory</span>
        </Link>
      </div>
      <OverdueAlertBanner
        key={`overdue-${user.id}-${user.status}-${overdueSubscriptions.length}`}
        user={user}
        overdueSubscriptions={overdueSubscriptions}
      />
      <CustomerProfileCard key={`profile-${user.id}-${user.status}`} user={user} />
      <VehicleGarage
        key={`garage-${user.id}-${user.vehicles.length}`}
        vehicles={user.vehicles}
        userId={user.id}
        availablePlans={availablePlans}
      />
      <PurchaseLedger
        key={`${user.id}-${user.purchaseStats?.totalCount ?? 0}-${user.purchases[0]?.id ?? ''}`}
        userId={user.id}
        initialPurchases={user.purchases}
        stats={user.purchaseStats}
      />
    </div>
  );
}

async function fetchSelectedUser(userId?: string) {
  if (!userId) return null;
  const [user, spendAgg, totalTransactions, couponCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        vehicles: {
          where: { deletedAt: null },
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: DEFAULT_PURCHASE_PAGE_SIZE,
        },
      },
    }),
    prisma.purchase.aggregate({
      where: { userId, status: PurchaseStatus.PAID },
      _sum: { amountCents: true },
    }),
    prisma.purchase.count({ where: { userId } }),
    prisma.purchase.count({ where: { userId, type: PurchaseType.COUPON } }),
  ]);

  if (!user) return null;

  return {
    ...user,
    purchaseStats: {
      lifetimeSpend: spendAgg._sum.amountCents ?? 0,
      totalCount: totalTransactions,
      couponCount,
    },
  };
}

async function fetchHomePageData(where: Prisma.UserWhereInput, userId?: string) {
  const [rawUsers, totalCount, selectedUser, availablePlans] = await Promise.all([
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
    fetchSelectedUser(userId),
    prisma.plan.findMany({
      orderBy: { priceCents: 'asc' },
    }),
  ]);

  const { items, nextCursor, hasMore } = extractPaginatedItems(rawUsers, DEFAULT_PAGE_SIZE);
  return {
    directoryUsers: items.map(toDirectoryCustomer),
    totalCount,
    nextCursor,
    hasMore,
    selectedUser,
    availablePlans,
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  await connection();
  const { q, userId } = await searchParams;
  const where = buildSearchWhereClause(q);
  const data = await fetchHomePageData(where, userId);

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 h-full overflow-hidden">
      <div
        className={`${
          data.selectedUser ? 'hidden md:block' : 'block'
        } md:col-span-4 lg:col-span-4 xl:col-span-3 h-full min-h-0 overflow-hidden`}
      >
        <CustomerList
          initialUsers={data.directoryUsers}
          totalCount={data.totalCount}
          initialNextCursor={data.nextCursor}
          initialHasMore={data.hasMore}
          currentQuery={q}
          selectedUserId={userId}
        />
      </div>

      <div
        className={`${
          data.selectedUser ? 'block' : 'hidden md:block'
        } md:col-span-8 lg:col-span-8 xl:col-span-9 h-full min-h-0 overflow-y-auto bg-slate-50`}
      >
        {data.selectedUser ? (
          <CustomerWorkspace
            key={data.selectedUser.id}
            user={data.selectedUser}
            currentQuery={q}
            availablePlans={data.availablePlans}
          />
        ) : (
          <WorkspacePlaceholder />
        )}
      </div>
    </div>
  );
}
