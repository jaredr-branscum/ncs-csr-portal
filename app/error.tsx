'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('CSR Portal service error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center min-h-[calc(100vh-4rem)]">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">Service Temporarily Unavailable</h2>

      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        The portal is unable to connect to customer account services. Please retry in a few moments, or
        contact Internal Support if the issue persists.
      </p>

      {error.digest && (
        <div className="mb-6 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-mono text-slate-600">
          Incident Reference: {error.digest}
        </div>
      )}

      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm shadow-sm transition-all cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Retry</span>
      </button>
    </div>
  );
}
