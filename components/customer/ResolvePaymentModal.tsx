'use client';

import { useActionState, useEffect, useState } from 'react';
import { UserStatus } from '@prisma/client';
import {
  resolveOverduePaymentAction,
  type PaymentActionResult,
} from '@/app/actions/payment';
import { calculateOverdueSettlement } from '@/lib/domain/payment';
import { calculateNextBillingDate, formatDate } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/utils/currency';
import { LicensePlateBadge } from './LicensePlateBadge';
import { FormErrorBanner } from './FormErrorBanner';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  FileCheck,
} from 'lucide-react';

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

interface ResolvePaymentModalProps {
  user: {
    id: string;
    name: string;
    status: UserStatus;
  };
  overdueSubscriptions: readonly OverdueAlertSubscription[];
  locale?: string;
  onClose: () => void;
}

function ResolveHeader({
  onClose,
  isZeroBalance,
}: {
  onClose: () => void;
  isZeroBalance: boolean;
}) {
  const title = isZeroBalance ? 'Clear Account Delinquency' : 'Resolve Overdue Payment';
  const subtitle = isZeroBalance
    ? 'Restore customer account to Active and unlock car wash gate access.'
    : 'Settle past-due subscription balance and unlock car wash gate access.';

  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h3 id="resolve-payment-title" className="text-sm font-bold text-slate-900">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
        aria-label="Close dialog"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function OverdueVehicleLabel({ sub }: { sub: OverdueAlertSubscription }) {
  const title = sub.vehicle
    ? `${sub.vehicle.year} ${sub.vehicle.make} ${sub.vehicle.model}`
    : 'Vehicle Membership';

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-900">{title}</span>
        {sub.vehicle && <LicensePlateBadge plate={sub.vehicle.licensePlate} />}
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub.plan.name} Plan</p>
    </div>
  );
}

function OverdueItemRow({
  sub,
  locale,
  selectable,
  isSelected,
  onToggle,
}: {
  sub: OverdueAlertSubscription;
  locale?: string;
  selectable: boolean;
  isSelected: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      onClick={selectable && onToggle ? onToggle : undefined}
      className={`p-3 bg-slate-50 border rounded-xl flex items-center justify-between gap-3 ${
        selectable ? 'cursor-pointer hover:bg-slate-100/80 transition-colors' : ''
      } ${isSelected ? 'border-slate-300' : 'border-slate-200/80 opacity-60'}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {selectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${sub.plan.name} pass for ${sub.vehicle ? sub.vehicle.licensePlate : 'vehicle'}`}
            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
          />
        )}
        <OverdueVehicleLabel sub={sub} />
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs font-bold text-slate-900">
          {formatCurrency(sub.plan.priceCents, { locale })}
        </span>
      </div>
    </div>
  );
}

function SettlementImpacts({
  totalAmountCents,
  nextBillingFormatted,
  locale,
}: {
  totalAmountCents: number;
  nextBillingFormatted: string;
  locale?: string;
}) {
  const formattedTotal = formatCurrency(totalAmountCents, { locale });

  return (
    <div className="p-3.5 bg-gradient-to-br from-rose-50/80 to-amber-50/50 border border-rose-200/80 rounded-xl space-y-2.5 text-xs text-rose-950">
      <div className="flex items-center justify-between font-bold text-rose-900 pb-2 border-b border-rose-200/60">
        <span>Total Settlement Due:</span>
        <span className="text-sm font-extrabold text-rose-950">{formattedTotal}</span>
      </div>
      <ul className="space-y-1.5 pl-6 list-disc text-[11px] text-rose-800 leading-relaxed">
        <li>
          <span className="font-semibold text-rose-900">Instant Wash Access:</span> Automated RFID gate entry unlocks immediately for settled vehicles.
        </li>
        <li>
          <span className="flex items-center gap-1 font-semibold text-rose-900">
            <Calendar className="w-3.5 h-3.5 inline text-rose-600 shrink-0" />
            Billing Cycle Reset:
          </span>
          Next recurring membership charge scheduled for <strong>{nextBillingFormatted}</strong>.
        </li>
        <li>
          <span className="flex items-center gap-1 font-semibold text-rose-900">
            <FileCheck className="w-3.5 h-3.5 inline text-rose-600 shrink-0" />
            Financial Ledger Record:
          </span>
          Generates an immutable paid purchase invoice in the customer transaction ledger.
        </li>
      </ul>
    </div>
  );
}

function SubmitButtonContent({
  isPending,
  pendingText,
  buttonText,
}: {
  isPending: boolean;
  pendingText: string;
  buttonText: string;
}) {
  if (isPending) {
    return (
      <>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{pendingText}</span>
      </>
    );
  }

  return (
    <>
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>{buttonText}</span>
    </>
  );
}

interface ResolveModalActionsProps {
  onClose: () => void;
  isPending: boolean;
  formattedAmount: string;
  hasSelection: boolean;
  isZeroBalance: boolean;
}

function ResolveModalActions({
  onClose,
  isPending,
  formattedAmount,
  hasSelection,
  isZeroBalance,
}: ResolveModalActionsProps) {
  const buttonText = isZeroBalance
    ? 'Clear Delinquency & Unlock Gate'
    : `Confirm Settlement (${formattedAmount})`;
  const pendingText = isZeroBalance
    ? 'Clearing Delinquency...'
    : 'Settling & Restoring Access...';

  return (
    <div className="pt-4 flex flex-col gap-2 border-t border-slate-100">
      {!hasSelection && (
        <p className="text-[11px] font-medium text-amber-700 flex items-center gap-1 justify-end">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Select at least one vehicle to resolve.</span>
        </p>
      )}
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !hasSelection}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SubmitButtonContent
            isPending={isPending}
            pendingText={pendingText}
            buttonText={buttonText}
          />
        </button>
      </div>
    </div>
  );
}

function AdministrativeClearanceImpacts() {
  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-800">
      <div className="flex items-center justify-between font-bold text-slate-900 pb-2 border-b border-slate-200">
        <span>Administrative Account Clearance:</span>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
          $0.00 Balance Due
        </span>
      </div>
      <p className="text-[11px] text-slate-600 leading-relaxed">
        This customer has no active delinquent passes. Confirming will clear the account delinquency status and restore automated RFID gate access to Active.
      </p>
      <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-slate-600 leading-relaxed">
        <li>
          <span className="font-semibold text-slate-900">Instant Wash Access:</span> Automated RFID gate entry unlocks immediately (Account status flips to Active).
        </li>
        <li>
          <span className="font-semibold text-slate-900">Zero Financial Impact:</span> No payment method is charged and no purchase invoice is generated.
        </li>
        <li>
          <span className="font-semibold text-slate-900">Compliance Audit:</span> An administrative clearance event is recorded in the CSR audit log.
        </li>
      </ul>
    </div>
  );
}

function DelinquentSubscriptionList({
  overdueSubscriptions,
  selectedIds,
  onToggle,
  locale,
}: {
  overdueSubscriptions: readonly OverdueAlertSubscription[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  locale?: string;
}) {
  if (overdueSubscriptions.length === 0) {
    return null;
  }

  const isMultiple = overdueSubscriptions.length > 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">
          Delinquent Subscriptions ({overdueSubscriptions.length}):
        </p>
        {isMultiple && (
          <span className="text-[11px] text-slate-500">
            {selectedIds.length} of {overdueSubscriptions.length} selected
          </span>
        )}
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {overdueSubscriptions.map((sub) => (
          <OverdueItemRow
            key={sub.id}
            sub={sub}
            locale={locale}
            selectable={isMultiple}
            isSelected={selectedIds.includes(sub.id)}
            onToggle={() => onToggle(sub.id)}
          />
        ))}
      </div>
    </div>
  );
}

function useResolvePaymentState(
  overdueSubscriptions: ResolvePaymentModalProps['overdueSubscriptions'],
  onClose: () => void
) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    overdueSubscriptions.map((s) => s.id)
  );

  const [state, formAction, isPending] = useActionState<PaymentActionResult | null, FormData>(
    resolveOverduePaymentAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return { selectedIds, toggleSelect, state, formAction, isPending };
}

function SettlementFormBody({
  isZeroBalance,
  overdueSubscriptions,
  selectedIds,
  onToggle,
  totalAmountCents,
  nextBillingFormatted,
  locale,
}: {
  isZeroBalance: boolean;
  overdueSubscriptions: readonly OverdueAlertSubscription[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  totalAmountCents: number;
  nextBillingFormatted: string;
  locale?: string;
}) {
  if (isZeroBalance) {
    return <AdministrativeClearanceImpacts />;
  }

  return (
    <>
      <DelinquentSubscriptionList
        overdueSubscriptions={overdueSubscriptions}
        selectedIds={selectedIds}
        onToggle={onToggle}
        locale={locale}
      />
      <SettlementImpacts
        totalAmountCents={totalAmountCents}
        nextBillingFormatted={nextBillingFormatted}
        locale={locale}
      />
    </>
  );
}

function ResolvePaymentForm({
  user,
  overdueSubscriptions,
  locale,
  onClose,
}: ResolvePaymentModalProps) {
  const { selectedIds, toggleSelect, state, formAction, isPending } =
    useResolvePaymentState(overdueSubscriptions, onClose);

  const selectedSubs = overdueSubscriptions.filter((s) => selectedIds.includes(s.id));
  const settlement = calculateOverdueSettlement(selectedSubs);
  const nextBillingFormatted = formatDate(calculateNextBillingDate());
  const formattedAmount = formatCurrency(settlement.totalAmountCents, { locale });
  const isZeroBalance = overdueSubscriptions.length === 0;

  return (
    <>
      {state?.formError && <FormErrorBanner message={state.formError} />}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="userId" value={user.id} />
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="subscriptionIds" value={id} />
        ))}
        <SettlementFormBody
          isZeroBalance={isZeroBalance}
          overdueSubscriptions={overdueSubscriptions}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          totalAmountCents={settlement.totalAmountCents}
          nextBillingFormatted={nextBillingFormatted}
          locale={locale}
        />
        <ResolveModalActions
          onClose={onClose}
          isPending={isPending}
          formattedAmount={formattedAmount}
          hasSelection={isZeroBalance || selectedIds.length > 0}
          isZeroBalance={isZeroBalance}
        />
      </form>
    </>
  );
}

export function ResolvePaymentModal(props: ResolvePaymentModalProps) {
  const isZeroBalance = props.overdueSubscriptions.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
        <ResolveHeader onClose={props.onClose} isZeroBalance={isZeroBalance} />
        <ResolvePaymentForm {...props} />
      </div>
    </div>
  );
}
