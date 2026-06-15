import type { LucideIcon } from "lucide-react";

type TrustBadgeProps = {
  icon: LucideIcon;
  label: string;
  className?: string;
};

/**
 * Small reusable pill used to convey trust signals (verified, AI-powered, etc.).
 */
export default function TrustBadge({
  icon: Icon,
  label,
  className = "",
}: TrustBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink-muted backdrop-blur ${className}`}
    >
      <Icon className="h-3.5 w-3.5 text-cyan" aria-hidden />
      {label}
    </span>
  );
}
