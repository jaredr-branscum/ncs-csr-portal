'use client';

import { useActionState, useEffect } from 'react';
import type { User } from '@prisma/client';
import { updateAccountAction, type AccountActionResult } from '@/app/actions/account';
import { X, UserCheck, Loader2, AlertCircle } from 'lucide-react';
import { FormErrorBanner } from './FormErrorBanner';

interface EditAccountModalProps {
  user: User;
  onClose: () => void;
}

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  type?: string;
  placeholder?: string;
}

function AccountFormField({ id, name, label, defaultValue, error, type = 'text', placeholder }: FormFieldProps) {
  return (
    <div>
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
          <UserCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Edit Customer Account</h3>
          <p className="text-[11px] text-slate-500">Update customer legal name, email, and primary phone.</p>
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
        <span>{isPending ? 'Saving...' : 'Save Changes'}</span>
      </button>
    </div>
  );
}

export function EditAccountModal({ user, onClose }: EditAccountModalProps) {
  const [state, formAction, isPending] = useActionState<AccountActionResult | null, FormData>(
    updateAccountAction,
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
            <input type="hidden" name="userId" value={user.id} />
            <AccountFormField id="name" name="name" label="Legal Full Name" defaultValue={user.name} error={state?.fieldErrors?.name} />
            <AccountFormField id="email" name="email" label="Email Address" type="email" defaultValue={user.email} error={state?.fieldErrors?.email} />
            <AccountFormField id="phone" name="phone" label="Phone Number" defaultValue={user.phone} error={state?.fieldErrors?.phone} />
            <ModalFooter onClose={onClose} isPending={isPending} />
          </form>
        </div>
      </div>
    </div>
  );
}
