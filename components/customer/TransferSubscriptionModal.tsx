'use client';

import { useActionState, useEffect, useState } from 'react';
import { SubscriptionStatus, type Plan, type Subscription, type Vehicle } from '@prisma/client';
import { transferSubscriptionAction } from '@/app/actions/subscription';
import { isVehicleVacant } from '@/lib/domain/subscription';
import { type VehicleWithSubscriptions } from './VehicleGarage';
import {
  X,
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  ArrowDown,
  Info,
  AlertCircle,
} from 'lucide-react';
import { LicensePlateBadge } from './LicensePlateBadge';
import { formatCurrency } from '@/lib/utils/currency';
import { FormErrorBanner } from './FormErrorBanner';

interface TransferSubscriptionModalProps {
  subscription: Subscription & { plan: Plan };
  sourceVehicle: Vehicle;
  customerVehicles: VehicleWithSubscriptions[];
  onClose: () => void;
}

function TransferModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <ArrowRightLeft className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Transfer Subscription</h3>
          <p className="text-[11px] text-slate-500">
            Reassign recurring membership plan between customer vehicles.
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

function SourceVehicleBanner({
  sourceVehicle,
  plan,
  status,
}: {
  sourceVehicle: Vehicle;
  plan: Plan;
  status: SubscriptionStatus;
}) {
  const isOverdue = status === SubscriptionStatus.OVERDUE;
  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Source Vehicle {isOverdue ? '(Past Due)' : '(Active)'}
        </span>
        <span className="text-xs font-bold text-slate-900">
          {formatCurrency(plan.priceCents)}/mo
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LicensePlateBadge plate={sourceVehicle.licensePlate} />
          <div>
            <p className="text-xs font-bold text-slate-900">
              {sourceVehicle.year} {sourceVehicle.make} {sourceVehicle.model}
            </p>
            <p className="text-[11px] text-slate-500 capitalize">{sourceVehicle.color}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs">
          {plan.name}
        </span>
      </div>
    </div>
  );
}

function TargetVehicleOptionItem({
  vehicle,
  isSelected,
  onSelect,
}: {
  vehicle: VehicleWithSubscriptions;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(vehicle.id)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(vehicle.id);
        }
      }}
      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
        isSelected
          ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 shadow-2xs'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {isSelected ? (
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
          )}
        </div>
        <LicensePlateBadge plate={vehicle.licensePlate} />
        <div>
          <p className="text-xs font-bold text-slate-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p className="text-[11px] text-slate-500 capitalize">{vehicle.color}</p>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        Vacant
      </span>
    </div>
  );
}

function NoEligibleVehiclesNotice() {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1.5">
      <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
      <p className="text-xs font-bold text-amber-950">No vacant vehicles in customer garage</p>
      <p className="text-[11px] text-amber-800 leading-relaxed">
        To transfer this subscription, add another vehicle to the customer garage or cancel an active pass first.
      </p>
    </div>
  );
}

function TransferModalFooter({
  onClose,
  isPending,
  hasEligibleTargets,
}: {
  onClose: () => void;
  isPending: boolean;
  hasEligibleTargets: boolean;
}) {
  return (
    <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
      <button
        type="button"
        onClick={onClose}
        className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
      >
        {hasEligibleTargets ? 'Cancel' : 'Close'}
      </button>
      {hasEligibleTargets && (
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{isPending ? 'Transferring...' : 'Confirm Transfer'}</span>
        </button>
      )}
    </div>
  );
}

function TargetVehicleSection({
  hasEligibleTargets,
  eligibleVehicles,
  selectedTargetId,
  onSelectTarget,
  error,
}: {
  hasEligibleTargets: boolean;
  eligibleVehicles: VehicleWithSubscriptions[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  error?: string;
}) {
  if (!hasEligibleTargets) {
    return <NoEligibleVehiclesNotice />;
  }

  return (
    <>
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Select Target Vehicle in Garage
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
          {eligibleVehicles.map((vehicle) => (
            <TargetVehicleOptionItem
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={selectedTargetId === vehicle.id}
              onSelect={onSelectTarget}
            />
          ))}
        </div>
        {error && <p className="text-[11px] font-medium text-rose-600 mt-1">{error}</p>}
      </div>

      <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-2.5 text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          RFID wash gate scan privileges will immediately transfer to the target vehicle. Billing date and renewal rate remain unchanged.
        </p>
      </div>
    </>
  );
}

function TransferDivider() {
  return (
    <div className="flex justify-center -my-1">
      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
        <ArrowDown className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

interface TransferFormProps {
  subscription: Subscription & { plan: Plan };
  sourceVehicle: Vehicle;
  eligibleVehicles: VehicleWithSubscriptions[];
  onClose: () => void;
}

function IneligibleTransferNotice() {
  return (
    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
      <span>Past-due subscriptions cannot be transferred. Please resolve outstanding balances first.</span>
    </div>
  );
}

function TransferForm(props: TransferFormProps) {
  const { onClose, subscription, sourceVehicle, eligibleVehicles } = props;
  const [selectedTargetId, setSelectedTargetId] = useState(eligibleVehicles[0]?.id ?? '');
  const [state, formAction, isPending] = useActionState(transferSubscriptionAction, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const isEligibleStatus = subscription.status === SubscriptionStatus.ACTIVE;
  const canSubmit = eligibleVehicles.length > 0 && isEligibleStatus;

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="subscriptionId" value={subscription.id} />
      <input type="hidden" name="targetVehicleId" value={selectedTargetId} />

      <SourceVehicleBanner
        sourceVehicle={sourceVehicle}
        plan={subscription.plan}
        status={subscription.status}
      />

      <TransferDivider />

      {!isEligibleStatus ? (
        <IneligibleTransferNotice />
      ) : (
        <TargetVehicleSection
          hasEligibleTargets={eligibleVehicles.length > 0}
          eligibleVehicles={eligibleVehicles}
          selectedTargetId={selectedTargetId}
          onSelectTarget={setSelectedTargetId}
          error={state?.fieldErrors?.targetVehicleId}
        />
      )}

      {state?.formError && <FormErrorBanner message={state.formError} />}

      <TransferModalFooter
        onClose={onClose}
        isPending={isPending}
        hasEligibleTargets={canSubmit}
      />
    </form>
  );
}

export function TransferSubscriptionModal({
  subscription,
  sourceVehicle,
  customerVehicles,
  onClose,
}: TransferSubscriptionModalProps) {
  const eligibleVehicles = customerVehicles.filter(
    (v) => v.id !== sourceVehicle.id && isVehicleVacant(v.subscriptions)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <TransferModalHeader onClose={onClose} />
          <TransferForm
            subscription={subscription}
            sourceVehicle={sourceVehicle}
            eligibleVehicles={eligibleVehicles}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
