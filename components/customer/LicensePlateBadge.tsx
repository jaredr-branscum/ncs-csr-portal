interface LicensePlateBadgeProps {
  plate: string;
  className?: string;
}

export function LicensePlateBadge({ plate, className = '' }: LicensePlateBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono tracking-wider font-bold text-xs bg-amber-50 text-amber-950 border border-amber-300 rounded-md px-1.5 py-0.5 shadow-2xs select-all ${className}`}
      aria-label={`License plate: ${plate}`}
    >
      <span className="text-[9px] font-sans font-bold tracking-tight uppercase bg-amber-200/80 text-amber-900 px-1 py-0.5 rounded leading-none">
        PLATE
      </span>
      <span>{plate.toUpperCase()}</span>
    </span>
  );
}
