'use client';

import { useActionState, useEffect } from 'react';
import type { User } from '@prisma/client';
import { deactivateAccountAction } from '@/app/actions/account';
import { X, AlertTriangle, Loader2, UserX, ShieldOff, FileText } from 'lucide-react';
import { FormErrorBanner } from './FormErrorBanner';

interface DeactivateAccountModalProps {
  user: User;
  onClose: () => void;
}

function DeactivateHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <UserX className="w-5 h-5" />
        </div>
        <div>
          <h3 id="deactivate-account-title" className="text-sm font-bold text-slate-900">
            Deactivate Customer Account
          </h3>
          <p className="text-[11px] text-slate-500">
            Suspend customer account and cancel all active vehicle memberships.
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

function DeactivateImpacts({ customerName }: { customerName: string }) {
  return (
    <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-2.5 text-xs text-rose-950">
      <div className="flex items-center gap-2 font-bold text-rose-900">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>Impacts of deactivating {customerName}:</span>
      </div>
      <ul className="space-y-1.5 pl-6 list-disc text-[11px] text-rose-800 leading-relaxed">
        <li>
          <strong>Cascading Pass Cancellation:</strong> Any active or overdue vehicle subscriptions will be immediately cancelled.
        </li>
        <li>
          <span className="flex items-center gap-1 font-semibold text-rose-900">
            <ShieldOff className="w-3.5 h-3.5 inline text-rose-600 shrink-0" />
            Gate Access Shutoff:
          </span>
          RFID vehicle scans will be rejected at automated wash entrances.
        </li>
        <li>
          <span className="flex items-center gap-1 font-semibold text-rose-900">
            <FileText className="w-3.5 h-3.5 inline text-rose-600 shrink-0" />
            Financial Audit Preserved:
          </span>
          Historical transactions, invoices, and audit records remain intact for reporting.
        </li>
      </ul>
    </div>
  );
}

function DeactivateReasonInput() {
  return (
    <div>
      <label
        htmlFor="deactivate-reason"
        className="block text-xs font-semibold text-slate-700 mb-1.5"
      >
        Deactivation Reason (Optional)
      </label>
      <input
        id="deactivate-reason"
        name="reason"
        type="text"
        maxLength={500}
        placeholder="e.g. Customer moving, vehicle sold, churn request..."
        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
      />
    </div>
  );
}

function DeactivateModalActions({
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
        Keep Account Active
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Deactivating...</span>
          </>
        ) : (
          <>
            <UserX className="w-3.5 h-3.5" />
            <span>Confirm Deactivation</span>
          </>
        )}
      </button>
    </div>
  );
}

export function DeactivateAccountModal({
  user,
  onClose,
}: DeactivateAccountModalProps) {
  const [state, formAction, isPending] = useActionState(deactivateAccountAction, null);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-5">
        <DeactivateHeader onClose={onClose} />

        {state?.formError && <FormErrorBanner message={state.formError} />}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          <DeactivateImpacts customerName={user.name} />
          <DeactivateReasonInput />
          <DeactivateModalActions
            onClose={onClose}
            isPending={isPending}
          />
        </form>
      </div>
    </div>
  );
}
