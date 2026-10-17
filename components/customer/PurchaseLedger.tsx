'use client';

import { useState, useTransition } from 'react';
import { PurchaseStatus, type Purchase } from '@prisma/client';
import { Receipt, AlertCircle, CheckCircle2, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { PurchaseTypeBadge } from './PurchaseTypeBadge';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import {
  calculateLifetimeSpend,
  countCouponsRedeemed,
  isFreeCoupon,
  calculateTotalPages,
  calculateItemRange,
  DEFAULT_PURCHASE_PAGE_SIZE,
} from '@/lib/domain/purchase';
import { loadPurchaseHistoryPageAction } from '@/app/actions/purchase';

export interface PurchaseStats {
  lifetimeSpend: number;
  totalCount: number;
  couponCount: number;
}

interface PurchaseLedgerProps {
  userId?: string;
  purchases?: Purchase[];
  initialPurchases?: Purchase[];
  stats?: PurchaseStats;
}

function PurchaseStatsBar({
  purchases,
  stats,
}: {
  purchases: Purchase[];
  stats?: PurchaseStats;
}) {
  const lifetimeSpend = stats ? stats.lifetimeSpend : calculateLifetimeSpend(purchases);
  const couponCount = stats ? stats.couponCount : countCouponsRedeemed(purchases);
  const transactionCount = stats ? stats.totalCount : purchases.length;

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Lifetime Spend</p>
        <p className="text-sm font-bold text-slate-900">{formatCurrency(lifetimeSpend)}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Transactions</p>
        <p className="text-sm font-bold text-slate-900">{transactionCount}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Promos Redeemed</p>
        <p className="text-sm font-bold text-emerald-700">{couponCount}</p>
      </div>
    </div>
  );
}

function AmountCell({ purchase }: { purchase: Purchase }) {
  if (purchase.status === PurchaseStatus.FAILED) {
    return (
      <div className="text-right">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
          <AlertCircle className="w-3 h-3" />
          FAILED
        </span>
        <p className="text-[10px] text-slate-400 line-through mt-0.5">{formatCurrency(purchase.amountCents)}</p>
      </div>
    );
  }

  if (isFreeCoupon(purchase.amountCents, purchase.type)) {
    return (
      <div className="text-right">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
          <Ticket className="w-3 h-3" />
          $0.00
        </span>
        <p className="text-[10px] text-emerald-600 font-medium">Free Promo</p>
      </div>
    );
  }

  return (
    <div className="text-right">
      <span className="text-xs font-bold text-slate-950">{formatCurrency(purchase.amountCents)}</span>
      <span className="flex items-center justify-end gap-1 text-[10px] text-emerald-600">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Paid
      </span>
    </div>
  );
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <PurchaseTypeBadge type={purchase.type} />
          <span className="text-[11px] font-medium text-slate-500">{formatDate(purchase.createdAt)}</span>
        </div>
        <p className="text-xs font-semibold text-slate-900 truncate">{purchase.description}</p>
      </div>
      <AmountCell purchase={purchase} />
    </div>
  );
}

function EmptyLedger() {
  return (
    <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl">
      <Receipt className="w-6 h-6 text-slate-400 mx-auto mb-2" />
      <p className="text-xs font-semibold text-slate-700 mb-0.5">No transaction history</p>
      <p className="text-[11px] text-slate-500">This customer has no purchases, renewals, or coupon redemptions recorded.</p>
    </div>
  );
}

function LedgerHeader() {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
        <Receipt className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-950">Billing & Purchase Ledger</h2>
        <p className="text-[11px] text-slate-500">Review receipts, single washes, renewals, and coupon promotions.</p>
      </div>
    </div>
  );
}

interface LedgerPaginationBarProps {
  currentPage: number;
  totalPages: number;
  start: number;
  end: number;
  totalCount: number;
  isPending: boolean;
  onPageChange: (page: number) => void;
}

function LedgerPaginationBar({
  currentPage,
  totalPages,
  start,
  end,
  totalCount,
  isPending,
  onPageChange,
}: LedgerPaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
      <p className="text-xs text-slate-500 font-medium">
        Showing <span className="font-semibold text-slate-800">{start}</span>–
        <span className="font-semibold text-slate-800">{end}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalCount}</span> transactions
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="text-xs font-medium text-slate-600 px-1">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function LedgerRows({
  items,
  isPending,
}: {
  items: Purchase[];
  isPending: boolean;
}) {
  if (items.length === 0) {
    return <EmptyLedger />;
  }

  return (
    <div
      className={`space-y-2.5 transition-opacity duration-150 ${
        isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'
      }`}
    >
      {items.map((purchase) => (
        <PurchaseRow key={purchase.id} purchase={purchase} />
      ))}
    </div>
  );
}

export function PurchaseLedger({
  userId,
  purchases,
  initialPurchases,
  stats,
}: PurchaseLedgerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<Purchase[]>(initialPurchases ?? purchases ?? []);
  const [isPending, startTransition] = useTransition();

  const totalCount = stats ? stats.totalCount : (initialPurchases ?? purchases ?? []).length;
  const totalPages = calculateTotalPages(totalCount, DEFAULT_PURCHASE_PAGE_SIZE);
  const { start, end } = calculateItemRange(currentPage, DEFAULT_PURCHASE_PAGE_SIZE, totalCount);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || !userId) return;
    startTransition(async () => {
      const res = await loadPurchaseHistoryPageAction(userId, newPage, DEFAULT_PURCHASE_PAGE_SIZE);
      if (res.success) {
        setItems(res.purchases);
        setCurrentPage(newPage);
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
      <LedgerHeader />
      {(items.length > 0 || (stats && stats.totalCount > 0)) && (
        <PurchaseStatsBar purchases={items} stats={stats} />
      )}
      <LedgerRows items={items} isPending={isPending} />
      <LedgerPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        start={start}
        end={end}
        totalCount={totalCount}
        isPending={isPending}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

