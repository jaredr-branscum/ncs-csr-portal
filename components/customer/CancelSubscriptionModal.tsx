'use client';

import { useActionState, useEffect } from 'react';
import type { Subscription, Plan, Vehicle } from '@prisma/client';
import { cancelSubscriptionAction, type SubscriptionActionResult } from '@/app/actions/subscription';
import { X, AlertTriangle, Loader2, ShieldX } from 'lucide-react';
import { LicensePlateBadge } from './LicensePlateBadge';
import { FormErrorBanner } from './FormErrorBanner';
import { formatCurrency } from '@/lib/utils/currency';

interface CancelSubscriptionModalProps {
  subscription: Subscription & { plan: Plan };
  vehicle: Vehicle;
  onClose: () => void;
}

function CancelModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <ShieldX className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Cancel Membership Pass</h3>
          <p className="text-[11px] text-slate-500">Terminate recurring subscription and gate privileges.</p>
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

function PassSummaryCard({
  subscription,
  vehicle,
}: {
  subscription: Subscription & { plan: Plan };
  vehicle: Vehicle;
}) {
  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
      <div className="flex items-center justify-between">
        <LicensePlateBadge plate={vehicle.licensePlate} />
        <span className="text-xs font-bold text-slate-900">
          {formatCurrency(subscription.plan.priceCents)}/mo
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
        <span className="text-slate-600 font-medium">{subscription.plan.name}</span>
      </div>
    </div>
  );
}

function WashAccessWarning() {
  return (
    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        RFID wash gate scans for this vehicle will immediately be rejected at all car wash entrances upon confirmation.
      </p>
    </div>
  );
}

function ReasonField({ error }: { error?: string }) {
  return (
    <div>
      <label htmlFor="reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
        Cancellation Reason <span className="text-slate-400 font-normal">(Optional)</span>
      </label>
      <textarea
        id="reason"
        name="reason"
        rows={2}
        maxLength={200}
        placeholder="e.g. Customer sold vehicle or relocated..."
        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors resize-none"
      />
      {error && <p className="text-[11px] font-medium text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function CancelModalFooter({ onClose, isPending }: { onClose: () => void; isPending: boolean }) {
  return (
    <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
      <button
        type="button"
        onClick={onClose}
        className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
      >
        Keep Membership
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
      >
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span>{isPending ? 'Cancelling...' : 'Confirm Cancellation'}</span>
      </button>
    </div>
  );
}

export function CancelSubscriptionModal({
  subscription,
  vehicle,
  onClose,
}: CancelSubscriptionModalProps) {
  const [state, formAction, isPending] = useActionState<SubscriptionActionResult | null, FormData>(
    cancelSubscriptionAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <CancelModalHeader onClose={onClose} />
          <WashAccessWarning />

          <form action={formAction} className="mt-4 space-y-4">
            <input type="hidden" name="subscriptionId" value={subscription.id} />
            <PassSummaryCard subscription={subscription} vehicle={vehicle} />
            <ReasonField error={state?.fieldErrors?.reason} />

            {state?.formError && <FormErrorBanner message={state.formError} />}

            <CancelModalFooter onClose={onClose} isPending={isPending} />
          </form>
        </div>
      </div>
    </div>
  );
}
