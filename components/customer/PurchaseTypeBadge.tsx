import { PurchaseType } from '@prisma/client';
import { RefreshCw, Droplets, Tag } from 'lucide-react';

interface PurchaseTypeBadgeProps {
  type: PurchaseType;
}

export function PurchaseTypeBadge({ type }: PurchaseTypeBadgeProps) {
  if (type === PurchaseType.SUBSCRIPTION) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
        <RefreshCw className="w-3 h-3" />
        Subscription
      </span>
    );
  }

  if (type === PurchaseType.COUPON) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Tag className="w-3 h-3" />
        Coupon Promo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
      <Droplets className="w-3 h-3" />
      Single Wash
    </span>
  );
}
