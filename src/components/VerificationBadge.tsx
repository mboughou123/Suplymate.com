import { BadgeCheck, Clock, XCircle, HelpCircle } from "lucide-react";
import type { VerificationStatus } from "@/lib/supplier-normalize";

const CONFIG: Record<
  VerificationStatus,
  { label: string; className: string; Icon: typeof BadgeCheck }
> = {
  verified: {
    label: "Verified",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Icon: BadgeCheck,
  },
  pending: {
    label: "Pending review",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Icon: Clock,
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 ring-rose-600/20",
    Icon: XCircle,
  },
  needs_info: {
    label: "Needs more info",
    className: "bg-sky-50 text-sky-700 ring-sky-600/20",
    Icon: HelpCircle,
  },
};

type Props = {
  status: VerificationStatus;
  size?: "sm" | "md";
  className?: string;
};

/** Pill showing a supplier's verification state, consistent across the app. */
export default function VerificationBadge({ status, size = "md", className = "" }: Props) {
  const { label, className: tone, Icon } = CONFIG[status] ?? CONFIG.pending;
  const sizing = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ring-1 ring-inset ${tone} ${sizing} ${className}`}
    >
      <Icon className={icon} aria-hidden />
      {label}
    </span>
  );
}
