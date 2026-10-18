'use client';

import { useState } from 'react';
import { UserStatus, type User } from '@prisma/client';
import {
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  Edit3,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  History,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { canReactivateAccount } from '@/lib/domain/account';
import { EditAccountModal } from './EditAccountModal';
import { DeactivateAccountModal } from './DeactivateAccountModal';
import { ReactivateAccountModal } from './ReactivateAccountModal';
import { AuditHistoryModal } from './AuditHistoryModal';

interface CustomerProfileCardProps {
  user: User;
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === UserStatus.ACTIVE) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <ShieldCheck className="w-3 h-3" />
        ACTIVE
      </span>
    );
  }
  if (status === UserStatus.OVERDUE) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <ShieldAlert className="w-3 h-3" />
        OVERDUE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
      <UserX className="w-3 h-3" />
      INACTIVE
    </span>
  );
}

function OverdueNotice() {
  return (
    <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-rose-900 mb-0.5">Payment Past Due — Wash Access Suspended</h4>
        <p className="text-[11px] text-rose-700 leading-relaxed">
          Vehicle RFID gate scans will be rejected at the wash entrance until outstanding balances are resolved.
        </p>
      </div>
    </div>
  );
}

function ContactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xs font-semibold text-slate-900 truncate">{value}</p>
    </div>
  );
}

interface ActionButtonsProps {
  user: User;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onViewAudit: () => void;
}

function ActionButtons({ user, onEdit, onDeactivate, onReactivate, onViewAudit }: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
      <button
        type="button"
        onClick={onViewAudit}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
        title="View immutable CSR audit log for this customer"
      >
        <History className="w-3.5 h-3.5 text-slate-500" />
        <span>Audit History</span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
      >
        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
        <span>Edit Profile</span>
      </button>

      {canReactivateAccount(user.status) ? (
        <button
          type="button"
          onClick={onReactivate}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Reactivate Account</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onDeactivate}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <UserX className="w-3.5 h-3.5 text-rose-600" />
          <span>Deactivate Account</span>
        </button>
      )}
    </div>
  );
}

interface ProfileModalsProps {
  user: User;
  isEditing: boolean;
  isDeactivating: boolean;
  isReactivating: boolean;
  isViewingAudit: boolean;
  onCloseEdit: () => void;
  onCloseDeactivate: () => void;
  onCloseReactivate: () => void;
  onCloseAudit: () => void;
}

function ProfileModals({
  user,
  isEditing,
  isDeactivating,
  isReactivating,
  isViewingAudit,
  onCloseEdit,
  onCloseDeactivate,
  onCloseReactivate,
  onCloseAudit,
}: ProfileModalsProps) {
  return (
    <>
      {isEditing && <EditAccountModal user={user} onClose={onCloseEdit} />}
      {isDeactivating && <DeactivateAccountModal user={user} onClose={onCloseDeactivate} />}
      {isReactivating && <ReactivateAccountModal user={user} onClose={onCloseReactivate} />}
      {isViewingAudit && (
        <AuditHistoryModal userId={user.id} customerName={user.name} onClose={onCloseAudit} />
      )}
    </>
  );
}

function CustomerProfileHeader({
  user,
  onEdit,
  onDeactivate,
  onReactivate,
  onViewAudit,
}: {
  user: User;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onViewAudit: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-slate-950 leading-tight">{user.name}</h2>
            <StatusBadge status={user.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Customer ID: <span className="font-mono text-slate-600">{user.id.slice(0, 8)}</span>
          </p>
        </div>
      </div>

      <ActionButtons
        user={user}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onReactivate={onReactivate}
        onViewAudit={onViewAudit}
      />
    </div>
  );
}

export function CustomerProfileCard({
  user,
}: CustomerProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isViewingAudit, setIsViewingAudit] = useState(false);
  const memberSince = formatDate(user.createdAt);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
      {user.status === UserStatus.OVERDUE && <OverdueNotice />}

      <CustomerProfileHeader
        user={user}
        onEdit={() => setIsEditing(true)}
        onDeactivate={() => setIsDeactivating(true)}
        onReactivate={() => setIsReactivating(true)}
        onViewAudit={() => setIsViewingAudit(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5">
        <ContactItem icon={<Mail className="w-3.5 h-3.5 text-slate-400" />} label="Email Address" value={user.email} />
        <ContactItem icon={<Phone className="w-3.5 h-3.5 text-slate-400" />} label="Phone Number" value={user.phone} />
        <ContactItem icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />} label="Member Since" value={memberSince} />
      </div>

      <ProfileModals
        user={user}
        isEditing={isEditing}
        isDeactivating={isDeactivating}
        isReactivating={isReactivating}
        isViewingAudit={isViewingAudit}
        onCloseEdit={() => setIsEditing(false)}
        onCloseDeactivate={() => setIsDeactivating(false)}
        onCloseReactivate={() => setIsReactivating(false)}
        onCloseAudit={() => setIsViewingAudit(false)}
      />
    </div>
  );
}
