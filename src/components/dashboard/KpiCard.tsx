import { Link } from "@/i18n/navigation";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { Count } from "./types";

type Props = {
  label: string;
  value: Count;
  /** Shown under the value. */
  sub: string;
  /** Shown instead of `sub` when the query failed (value === null). */
  unavailableLabel: string;
  icon: LucideIcon;
  href: string;
  /** Emphasise the number (e.g. unread > 0). */
  highlight?: boolean;
};

export default function KpiCard({
  label,
  value,
  sub,
  unavailableLabel,
  icon: Icon,
  href,
  highlight = false,
}: Props) {
  const unavailable = value === null;
  const isZero = value === 0;

  return (
    <Link
      href={href}
      className="group panel-glass panel-glass-hover relative flex h-full flex-col p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
            highlight
              ? "border-cyan/30 bg-cyan text-white"
              : "border-cyan/15 bg-cyan-soft text-cyan group-hover:border-cyan/30"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <ArrowUpRight
          className="h-4 w-4 text-ink-dim opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <p className="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-ink-dim">{label}</p>
      <p
        className={`mt-1 font-display text-[2rem] font-bold leading-none tracking-tight ${
          unavailable || isZero ? "text-ink-dim" : "text-ink"
        }`}
      >
        {unavailable ? "—" : value.toLocaleString()}
      </p>
      <p className="mt-2 text-xs text-ink-muted">{unavailable ? unavailableLabel : sub}</p>
    </Link>
  );
}
