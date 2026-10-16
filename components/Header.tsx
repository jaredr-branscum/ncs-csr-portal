import { Waves, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-white shrink-0">
      <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
          <Waves className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-white text-base">AMP</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-sky-950 text-sky-400 border border-sky-800/80 px-2 py-0.5 rounded-full">
              CSR Portal
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Car Wash Membership & Loyalty Platform</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 rounded-full px-3.5 py-1.5 shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-xs font-medium text-slate-300">CSR Console</span>
      </div>
    </header>
  );
}
