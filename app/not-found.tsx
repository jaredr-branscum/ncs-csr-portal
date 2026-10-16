import Link from 'next/link';
import { SearchX, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center min-h-[calc(100vh-4rem)]">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
        <SearchX className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">Customer or Resource Not Found</h2>

      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        The requested customer account or resource could not be found. Please return to the customer directory to select an active customer.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm shadow-sm transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Customer Directory</span>
      </Link>
    </div>
  );
}
