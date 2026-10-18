'use client';

import { useActionState, useEffect } from 'react';
import type { User } from '@prisma/client';
import { reactivateAccountAction } from '@/app/actions/account';
import { X, CheckCircle2, Loader2, UserCheck, ShieldAlert } from 'lucide-react';
import { FormErrorBanner } from './FormErrorBanner';

interface ReactivateAccountModalProps {
  user: User;
  onClose: () => void;
}

function ReactivateHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <UserCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 id="reactivate-account-title" className="text-sm font-bold text-slate-900">
            Reactivate Customer Account
          </h3>
          <p className="text-[11px] text-slate-500">
            Restore customer account to active standing.
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

function ReactivateImpacts({ customerName }: { customerName: string }) {
  return (
    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2.5 text-xs text-emerald-950">
      <div className="flex items-center gap-2 font-bold text-emerald-900">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Impacts of reactivating {customerName}:</span>
      </div>
      <ul className="space-y-1.5 pl-6 list-disc text-[11px] text-emerald-800 leading-relaxed">
        <li>
          <strong>Account Status Restored:</strong> Customer status will immediately return to ACTIVE standing.
        </li>
        <li>
          <span className="flex items-center gap-1 font-semibold text-emerald-900">
            <ShieldAlert className="w-3.5 h-3.5 inline text-amber-600 shrink-0" />
            Vehicle Passes Remain Cancelled:
          </span>
          Previous vehicle passes cancelled during deactivation will NOT be automatically billed or renewed. You must attach new subscriptions to vehicles for car wash gate entry.
        </li>
      </ul>
    </div>
  );
}

function ReactivateReasonInput() {
  return (
    <div>
      <label
        htmlFor="reactivate-reason"
        className="block text-xs font-semibold text-slate-700 mb-1.5"
      >
        Reactivation Reason (Optional)
      </label>
      <input
        id="reactivate-reason"
        name="reason"
        type="text"
        maxLength={500}
        placeholder="e.g. Customer returned, win-back promo, resolved account dispute..."
        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      />
    </div>
  );
}

function ReactivateModalActions({
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
        Keep Inactive
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Reactivating...</span>
          </>
        ) : (
          <>
            <UserCheck className="w-3.5 h-3.5" />
            <span>Confirm Reactivation</span>
          </>
        )}
      </button>
    </div>
  );
}

export function ReactivateAccountModal({
  user,
  onClose,
}: ReactivateAccountModalProps) {
  const [state, formAction, isPending] = useActionState(reactivateAccountAction, null);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reactivate-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-5">
        <ReactivateHeader onClose={onClose} />

        {state?.formError && <FormErrorBanner message={state.formError} />}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          <ReactivateImpacts customerName={user.name} />
          <ReactivateReasonInput />
          <ReactivateModalActions
            onClose={onClose}
            isPending={isPending}
          />
        </form>
      </div>
    </div>
  );
}
