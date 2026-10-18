'use client';

import { useEffect, useState, useTransition } from 'react';
import { AuditAction, type AuditLog } from '@prisma/client';
import { loadCustomerAuditHistoryAction } from '@/app/actions/audit';
import { formatDate } from '@/lib/utils/date';
import { X, History, User, Clock, Loader2, AlertCircle } from 'lucide-react';

interface AuditHistoryModalProps {
  userId: string;
  customerName: string;
  onClose: () => void;
}

function formatAuditTimestamp(date: Date | string): string {
  const parsed = date instanceof Date ? date : new Date(date);
  return `${formatDate(parsed)} ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function AuditActionBadge({ action }: { action: AuditAction }) {
  const styles: Record<AuditAction, string> = {
    [AuditAction.VIEW_CUSTOMER_360]: 'bg-slate-100 text-slate-700 border-slate-200',
    [AuditAction.UPDATE_ACCOUNT]: 'bg-sky-50 text-sky-700 border-sky-200',
    [AuditAction.ADD_VEHICLE]: 'bg-blue-50 text-blue-700 border-blue-200',
    [AuditAction.REMOVE_VEHICLE]: 'bg-amber-50 text-amber-700 border-amber-200',
    [AuditAction.SUBSCRIBE_VEHICLE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [AuditAction.TRANSFER_SUBSCRIPTION]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    [AuditAction.CANCEL_SUBSCRIPTION]: 'bg-rose-50 text-rose-700 border-rose-200',
    [AuditAction.RESOLVE_OVERDUE_PAYMENT]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [AuditAction.DEACTIVATE_ACCOUNT]: 'bg-rose-50 text-rose-700 border-rose-200',
    [AuditAction.REACTIVATE_ACCOUNT]: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
        styles[action] ?? 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function AuditLogItem({ log }: { log: AuditLog }) {
  return (
    <li className="p-3.5 bg-white border border-slate-200/90 rounded-xl space-y-1.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <AuditActionBadge action={log.action} />
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{formatAuditTimestamp(log.createdAt)}</span>
        </div>
      </div>

      <p className="text-xs text-slate-800 leading-relaxed font-medium">
        {log.details ?? 'No additional details provided.'}
      </p>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
        <User className="w-3 h-3 text-slate-400" />
        <span>
          Attributed to <span className="font-semibold text-slate-700">{log.operatorName}</span> ({log.operatorRole.replace(/_/g, ' ')})
        </span>
      </div>
    </li>
  );
}

function AuditModalHeader({
  customerName,
  onClose,
}: {
  customerName: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Customer Audit History</h3>
          <p className="text-[11px] text-slate-500">
            Immutable chronological audit log for {customerName}.
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

function AuditLogBody({
  isPending,
  logs,
  error,
}: {
  isPending: boolean;
  logs: AuditLog[];
  error?: string;
}) {
  if (isPending) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
        <span className="text-xs">Loading audit trail...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400 space-y-1">
        <History className="w-8 h-8 mx-auto text-slate-300" />
        <p className="text-xs font-semibold text-slate-600">No audit events recorded</p>
        <p className="text-[11px] text-slate-400">Mutations made to this account will be recorded here.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
      {logs.map((log) => (
        <AuditLogItem key={log.id} log={log} />
      ))}
    </ul>
  );
}

export function AuditHistoryModal({
  userId,
  customerName,
  onClose,
}: AuditHistoryModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await loadCustomerAuditHistoryAction(userId);
      if (res.success) {
        setLogs(res.logs);
      } else {
        setError(res.error);
      }
    });
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <AuditModalHeader customerName={customerName} onClose={onClose} />
          <div className="mt-4">
            <AuditLogBody isPending={isPending} logs={logs} error={error} />
          </div>
          <div className="pt-4 mt-4 flex justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
