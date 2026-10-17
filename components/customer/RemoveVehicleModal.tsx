'use client';

import { useActionState, useEffect } from 'react';
import type { Vehicle } from '@prisma/client';
import { removeVehicleAction } from '@/app/actions/vehicle';
import { X, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { LicensePlateBadge } from './LicensePlateBadge';
import { FormErrorBanner } from './FormErrorBanner';

interface RemoveVehicleModalProps {
  vehicle: Vehicle;
  userId: string;
  onClose: () => void;
}

function RemoveVehicleHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5" />
        </div>
        <div>
          <h3 id="remove-vehicle-title" className="text-sm font-bold text-slate-900">
            Remove Vehicle
          </h3>
          <p className="text-[11px] text-slate-500">
            Permanently remove vehicle from customer&apos;s garage.
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

function VehicleSummaryCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <LicensePlateBadge plate={vehicle.licensePlate} />
        <span className="text-xs font-semibold text-slate-500 capitalize">{vehicle.color}</span>
      </div>
      <div className="text-xs font-semibold text-slate-800">
        {vehicle.year} {vehicle.make} {vehicle.model}
      </div>
    </div>
  );
}

function RemovalWarning() {
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        This will permanently remove this vehicle from the customer&apos;s active garage.
      </p>
    </div>
  );
}

function RemoveVehicleFooter({
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
        disabled={isPending}
        className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
      >
        Keep Vehicle
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Removing...</span>
          </>
        ) : (
          <>
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Removal</span>
          </>
        )}
      </button>
    </div>
  );
}

export function RemoveVehicleModal({ vehicle, userId, onClose }: RemoveVehicleModalProps) {
  const [state, formAction, isPending] = useActionState(removeVehicleAction, null);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isPending]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-vehicle-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <form action={formAction} className="p-6 space-y-4">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <input type="hidden" name="userId" value={userId} />

          <RemoveVehicleHeader onClose={onClose} />
          <VehicleSummaryCard vehicle={vehicle} />
          <RemovalWarning />

          {state?.formError && <FormErrorBanner message={state.formError} />}

          <RemoveVehicleFooter onClose={onClose} isPending={isPending} />
        </form>
      </div>
    </div>
  );
}
