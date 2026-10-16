import { UserCheck, ShieldCheck, Receipt, Car } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-left">
      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5">
        {icon}
      </div>
      <h3 className="text-xs font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

export function WorkspacePlaceholder() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 mb-4 shadow-xs">
        <UserCheck className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">Customer 360 Workspace</h2>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
        Select a customer from the directory or search by name, email, phone, or license plate to access their profile.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        <FeatureCard
          icon={<Car className="w-4 h-4" />}
          title="Vehicle Passes"
          description="Manage, subscribe, and transfer vehicle memberships."
        />
        <FeatureCard
          icon={<ShieldCheck className="w-4 h-4" />}
          title="Account Standing"
          description="Resolve past-due balances to instantly restore customer wash access."
        />
        <FeatureCard
          icon={<Receipt className="w-4 h-4" />}
          title="Billing & Purchases"
          description="Review customer receipts, wash charges, and applied promotions."
        />
      </div>
    </div>
  );
}
