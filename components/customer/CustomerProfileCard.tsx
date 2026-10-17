import { UserStatus, type User } from '@prisma/client';
import { Mail, Phone, Calendar, ShieldCheck, ShieldAlert, UserX } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

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

export function CustomerProfileCard({ user }: CustomerProfileCardProps) {
  return (
    <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5">
        <ContactItem icon={<Mail className="w-3.5 h-3.5 text-slate-400" />} label="Email Address" value={user.email} />
        <ContactItem icon={<Phone className="w-3.5 h-3.5 text-slate-400" />} label="Phone Number" value={user.phone} />
        <ContactItem icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />} label="Member Since" value={formatDate(user.createdAt)} />
      </div>
    </div>
  );
}
