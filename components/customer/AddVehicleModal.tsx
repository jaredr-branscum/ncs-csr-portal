'use client';

import { useActionState, useEffect } from 'react';
import { addVehicleAction, type VehicleActionResult } from '@/app/actions/vehicle';
import { X, Car, Loader2, AlertCircle } from 'lucide-react';
import { FormErrorBanner } from './FormErrorBanner';

interface AddVehicleModalProps {
  userId: string;
  onClose: () => void;
}

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  type?: string;
  placeholder?: string;
  className?: string;
}

function VehicleFormField({
  id,
  name,
  label,
  defaultValue = '',
  error,
  type = 'text',
  placeholder,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-xs rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
            : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100'
        }`}
      />
      {error && (
        <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Car className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Add Customer Vehicle</h3>
          <p className="text-[11px] text-slate-500">Register a new vehicle to customer garage.</p>
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

function ModalFooter({ onClose, isPending }: { onClose: () => void; isPending: boolean }) {
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
        <span>{isPending ? 'Registering...' : 'Add Vehicle'}</span>
      </button>
    </div>
  );
}

function VehicleFormFields({ errors }: { errors?: Record<string, string> }) {
  const currentYear = new Date().getFullYear().toString();

  return (
    <>
      <VehicleFormField
        id="licensePlate"
        name="licensePlate"
        label="License Plate"
        placeholder="e.g. CA-7XYZ89 or FÜ-AB 123"
        error={errors?.licensePlate}
      />

      <div className="grid grid-cols-2 gap-3">
        <VehicleFormField id="make" name="make" label="Make" placeholder="e.g. Tesla" error={errors?.make} />
        <VehicleFormField id="model" name="model" label="Model" placeholder="e.g. Model Y" error={errors?.model} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <VehicleFormField
          id="year"
          name="year"
          label="Year"
          type="number"
          placeholder={currentYear}
          error={errors?.year}
        />
        <VehicleFormField
          id="color"
          name="color"
          label="Color"
          placeholder="e.g. Midnight Silver"
          error={errors?.color}
        />
      </div>
    </>
  );
}

export function AddVehicleModal({ userId, onClose }: AddVehicleModalProps) {
  const [state, formAction, isPending] = useActionState<VehicleActionResult | null, FormData>(
    addVehicleAction,
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
          <ModalHeader onClose={onClose} />

          {state?.formError && (
            <div className="mt-4">
              <FormErrorBanner message={state.formError} />
            </div>
          )}

          <form action={formAction} className="mt-5 space-y-4">
            <input type="hidden" name="userId" value={userId} />
            <VehicleFormFields errors={state?.fieldErrors} />
            <ModalFooter onClose={onClose} isPending={isPending} />
          </form>
        </div>
      </div>
    </div>
  );
}
