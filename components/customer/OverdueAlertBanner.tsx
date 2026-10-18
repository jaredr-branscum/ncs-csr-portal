'use client';

import { useState } from 'react';
import { UserStatus } from '@prisma/client';
import { calculateOverdueSettlement } from '@/lib/domain/payment';
import { formatCurrency } from '@/lib/utils/currency';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ResolvePaymentModal } from './ResolvePaymentModal';

export interface OverdueAlertSubscription {
  id: string;
  vehicle?: {
    licensePlate: string;
    make: string;
    model: string;
    year: number;
  } | null;
  plan: {
    name: string;
    priceCents: number;
  };
}

interface OverdueAlertBannerProps {
  user: {
    id: string;
    name: string;
    status: UserStatus;
  };
  overdueSubscriptions: readonly OverdueAlertSubscription[];
  locale?: string;
}

function OverdueBannerHeader() {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
        Wash Gate Access Barred · Delinquent
      </span>
    </div>
  );
}

function OverdueBannerDetails({
  overdueSubscriptions,
  totalCents,
  locale,
}: {
  overdueSubscriptions: readonly OverdueAlertSubscription[];
  totalCents: number;
  locale?: string;
}) {
  const primarySub = overdueSubscriptions[0];
  const formattedAmount = formatCurrency(totalCents, { locale });
  const isZeroBalance = totalCents === 0;

  const title = isZeroBalance
    ? 'Account Delinquency — Gate Entry Suspended'
    : `Overdue Balance: ${formattedAmount} — Gate Entry Suspended`;

  const description = primarySub?.vehicle
    ? `Affected: ${primarySub.vehicle.licensePlate} (${primarySub.vehicle.year} ${primarySub.vehicle.make} ${primarySub.vehicle.model} · ${primarySub.plan.name})`
    : isZeroBalance
      ? 'No active delinquent passes remain. Clear account delinquency to unlock automated entry.'
      : 'Outstanding membership balance requires settlement to unlock automated entry.';

  return (
    <div>
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <p className="text-xs text-slate-600 mt-0.5">
        Automated RFID entry is locked.
        <span className="ml-1 font-medium text-slate-800">{description}</span>
      </p>
    </div>
  );
}

function ResolvePaymentTrigger({
  onOpenModal,
  totalCents,
  locale,
}: {
  onOpenModal: () => void;
  totalCents: number;
  locale?: string;
}) {
  const formattedAmount = formatCurrency(totalCents, { locale });
  const label =
    totalCents === 0 ? 'Clear Delinquency' : `Resolve Payment (${formattedAmount})`;

  return (
    <div className="shrink-0 flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={onOpenModal}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{label}</span>
      </button>
    </div>
  );
}

export function OverdueAlertBanner({
  user,
  overdueSubscriptions,
  locale,
}: OverdueAlertBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isOverdue =
    user.status === UserStatus.OVERDUE || overdueSubscriptions.length > 0;

  if (!isOverdue) return null;

  const settlement = calculateOverdueSettlement(overdueSubscriptions);

  return (
    <>
      <div className="bg-gradient-to-r from-rose-50 via-rose-50/70 to-amber-50/60 border border-rose-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <OverdueBannerHeader />
              <OverdueBannerDetails
                overdueSubscriptions={overdueSubscriptions}
                totalCents={settlement.totalAmountCents}
                locale={locale}
              />
            </div>
          </div>
          <ResolvePaymentTrigger
            onOpenModal={() => setIsModalOpen(true)}
            totalCents={settlement.totalAmountCents}
            locale={locale}
          />
        </div>
      </div>

      {isModalOpen && (
        <ResolvePaymentModal
          user={user}
          overdueSubscriptions={overdueSubscriptions}
          locale={locale}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
