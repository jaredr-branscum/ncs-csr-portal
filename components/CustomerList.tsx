'use client';

import { useState, useTransition } from 'react';
import { Users, Car, SearchX, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { SearchInput } from './SearchInput';
import { UserStatus } from '@prisma/client';
import type { DirectoryCustomer } from '@/lib/domain/customer';
import { loadMoreCustomersAction } from '@/app/actions/directory';

interface CustomerListProps {
  initialUsers: DirectoryCustomer[];
  totalCount: number;
  initialNextCursor: string | null;
  initialHasMore: boolean;
  currentQuery?: string;
  selectedUserId?: string;
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === UserStatus.ACTIVE) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        ACTIVE
      </span>
    );
  }
  if (status === UserStatus.OVERDUE) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        OVERDUE
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
      INACTIVE
    </span>
  );
}

export const cancelPendingSearch = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('csr:cancel-search'));
  }
};

function CustomerCardContent({ user }: { user: DirectoryCustomer }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-slate-950 text-xs leading-snug">{user.name}</h3>
        <StatusBadge status={user.status} />
      </div>
      <p className="text-[11px] text-slate-500 font-mono mb-1 truncate">{user.maskedEmail}</p>
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
        <span className="font-mono text-[10px] text-slate-500">{user.maskedPhone}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
          <Car className="w-2.5 h-2.5 text-slate-500" />
          <span>{user.vehicleCount} {user.vehicleCount === 1 ? 'car' : 'cars'}</span>
        </span>
      </div>
    </>
  );
}

function CustomerCard({
  user,
  isSelected,
  currentQuery,
}: {
  user: DirectoryCustomer;
  isSelected: boolean;
  currentQuery?: string;
}) {
  const queryParam = currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : '';
  const href = `/?userId=${user.id}${queryParam}`;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    cancelPendingSearch();
  };

  const handleClick = (e: React.MouseEvent) => {
    cancelPendingSearch();
    if (isSelected) e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      cancelPendingSearch();
      if (isSelected) e.preventDefault();
    }
  };

  return (
    <li>
      <Link
        href={href}
        onPointerDown={cancelPendingSearch}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-current={isSelected ? 'page' : undefined}
        className={`block p-3 bg-white border rounded-xl transition-all ${
          isSelected
            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/40 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
        }`}
      >
        <CustomerCardContent user={user} />
      </Link>
    </li>
  );
}

function EmptyDirectoryState({ query }: { query?: string }) {
  return (
    <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl my-4">
      <SearchX className="w-6 h-6 text-slate-400 mx-auto mb-2" />
      <p className="text-xs font-semibold text-slate-700 mb-0.5">No customers found</p>
      <p className="text-[11px] text-slate-500">
        {query ? `No results for "${query}".` : 'No customers registered.'}
      </p>
    </div>
  );
}

function DirectoryHeader({
  count,
  totalCount,
  currentQuery,
}: {
  count: number;
  totalCount: number;
  currentQuery?: string;
}) {
  return (
    <div className="p-3.5 border-b border-slate-200 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <h1 className="text-xs font-bold text-slate-950">Registered Customers</h1>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {count} of {totalCount}
        </span>
      </div>
      <SearchInput defaultValue={currentQuery} />
    </div>
  );
}

function LoadMoreButton({ onClick, isPending }: { onClick: () => void; isPending: boolean }) {
  return (
    <div className="pt-2 pb-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="w-full py-2 px-3 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading more...</span>
          </>
        ) : (
          <span>Load More Customers</span>
        )}
      </button>
    </div>
  );
}

function DirectoryContent({
  users,
  hasMore,
  isPending,
  selectedUserId,
  currentQuery,
  onLoadMore,
}: {
  users: DirectoryCustomer[];
  hasMore: boolean;
  isPending: boolean;
  selectedUserId?: string;
  currentQuery?: string;
  onLoadMore: () => void;
}) {
  if (users.length === 0) {
    return <EmptyDirectoryState query={currentQuery} />;
  }

  return (
    <>
      <ul className="space-y-2" aria-label="Customer list">
        {users.map((user) => (
          <CustomerCard
            key={user.id}
            user={user}
            isSelected={user.id === selectedUserId}
            currentQuery={currentQuery}
          />
        ))}
      </ul>
      {hasMore && <LoadMoreButton onClick={onLoadMore} isPending={isPending} />}
    </>
  );
}

function syncFreshCustomers(
  prev: DirectoryCustomer[],
  fresh: DirectoryCustomer[]
): DirectoryCustomer[] {
  const freshMap = new Map(fresh.map((u) => [u.id, u]));
  return prev.map((u) => freshMap.get(u.id) ?? u);
}

function usePaginatedCustomers({
  initialUsers,
  initialNextCursor,
  initialHasMore,
  currentQuery,
}: {
  initialUsers: DirectoryCustomer[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  currentQuery?: string;
}) {
  const [prevInitialUsers, setPrevInitialUsers] = useState(initialUsers);
  const [prevQuery, setPrevQuery] = useState(currentQuery);
  const [users, setUsers] = useState<DirectoryCustomer[]>(initialUsers);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [isPending, startTransition] = useTransition();

  if (prevQuery !== currentQuery) {
    setPrevQuery(currentQuery);
    setPrevInitialUsers(initialUsers);
    setUsers(initialUsers);
    setNextCursor(initialNextCursor);
    setHasMore(initialHasMore);
  } else if (prevInitialUsers !== initialUsers) {
    setPrevInitialUsers(initialUsers);
    setUsers((prev) => syncFreshCustomers(prev, initialUsers));
  }

  const handleLoadMore = () => {
    if (!nextCursor || isPending) return;
    startTransition(async () => {
      const result = await loadMoreCustomersAction(nextCursor, currentQuery);
      if (result.success) {
        setUsers((prev) => [...prev, ...result.customers]);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      }
    });
  };

  return { users, hasMore, isPending, handleLoadMore };
}

export function CustomerList({
  initialUsers,
  totalCount,
  initialNextCursor,
  initialHasMore,
  currentQuery,
  selectedUserId,
}: CustomerListProps) {
  const { users, hasMore, isPending, handleLoadMore } = usePaginatedCustomers({
    initialUsers,
    initialNextCursor,
    initialHasMore,
    currentQuery,
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <DirectoryHeader
        count={users.length}
        totalCount={totalCount}
        currentQuery={currentQuery}
      />
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <DirectoryContent
          users={users}
          hasMore={hasMore}
          isPending={isPending}
          selectedUserId={selectedUserId}
          currentQuery={currentQuery}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}
