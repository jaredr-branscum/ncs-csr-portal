'use client';

import { useActionState, useEffect, useState } from 'react';
import type { Plan, Vehicle } from '@prisma/client';
import { subscribeVehicleAction, type SubscriptionActionResult } from '@/app/actions/subscription';
import { X, Sparkles, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LicensePlateBadge } from './LicensePlateBadge';
import { formatCurrency } from '@/lib/utils/currency';
import { FormErrorBanner } from './FormErrorBanner';

interface SubscribeModalProps {
  vehicle: Vehicle;
  availablePlans: Plan[];
  onClose: () => void;
}

function SubscribeModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Attach Wash Plan</h3>
          <p className="text-[11px] text-slate-500">Assign recurring wash subscription to vehicle.</p>
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

function TargetVehicleBanner({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <LicensePlateBadge plate={vehicle.licensePlate} />
        <div>
          <p className="text-xs font-bold text-slate-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p className="text-[11px] text-slate-500 capitalize">{vehicle.color}</p>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        Eligible for Plan
      </span>
    </div>
  );
}

function PlanOptionItem({
  plan,
  isSelected,
  onSelect,
}: {
  plan: Plan;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(plan.id)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(plan.id);
        }
      }}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
        isSelected
          ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 shadow-2xs'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isSelected ? (
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
          )}
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900">{plan.name}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{plan.description}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs font-bold text-slate-950">
          {formatCurrency(plan.priceCents)}
        </span>
        <span className="text-[10px] text-slate-500 block">/month</span>
      </div>
    </div>
  );
}

function ActivationNotice() {
  return (
    <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-2.5 text-xs text-sky-900">
      <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        Immediate RFID wash gate access will be granted upon subscription activation.
      </p>
    </div>
  );
}

function SubscribeModalFooter({
  onClose,
  isPending,
}: {
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
      <button
        type="button"
        onClick={onClose}
        className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
      >
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span>{isPending ? 'Activating Subscription...' : 'Activate Subscription'}</span>
      </button>
    </div>
  );
}

function PlanSelectionList({
  availablePlans,
  selectedPlanId,
  onSelectPlan,
  error,
}: {
  availablePlans: Plan[];
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">
        Select Wash Plan
      </label>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
        {availablePlans.map((plan) => (
          <PlanOptionItem
            key={plan.id}
            plan={plan}
            isSelected={selectedPlanId === plan.id}
            onSelect={onSelectPlan}
          />
        ))}
      </div>
      {error && <p className="text-[11px] font-medium text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

export function SubscribeModal({
  vehicle,
  availablePlans,
  onClose,
}: SubscribeModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    availablePlans[0]?.id ?? ''
  );

  const [state, formAction, isPending] = useActionState<
    SubscriptionActionResult | null,
    FormData
  >(subscribeVehicleAction, null);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <SubscribeModalHeader onClose={onClose} />

          <form action={formAction} className="mt-4 space-y-4">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <input type="hidden" name="planId" value={selectedPlanId} />

            <TargetVehicleBanner vehicle={vehicle} />

            <PlanSelectionList
              availablePlans={availablePlans}
              selectedPlanId={selectedPlanId}
              onSelectPlan={setSelectedPlanId}
              error={state?.fieldErrors?.planId}
            />

            <ActivationNotice />

            {state?.formError && <FormErrorBanner message={state.formError} />}

            <SubscribeModalFooter onClose={onClose} isPending={isPending} />
          </form>
        </div>
      </div>
    </div>
  );
}
