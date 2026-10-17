import { AlertCircle } from 'lucide-react';

interface FormErrorBannerProps {
  message: string;
}

/**
 * Accessible form-level rejection alert banner.
 * Strict precondition: must only be rendered when an error exists.
 */
export function FormErrorBanner({ message }: FormErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2"
    >
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
