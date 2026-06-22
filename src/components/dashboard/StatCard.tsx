"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  href?: string;
  /** When true, the metric has no real data yet — render a muted empty state. */
  empty?: boolean;
};

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  empty = false,
}: Props) {
  const card = (
    <div className="group h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-gold/40 hover:shadow-card">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-ink-dim">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${
          empty ? "text-ink-dim" : "text-ink"
        }`}
      >
        {empty ? "—" : value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-muted">{sub}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {card}
      </Link>
    );
  }
  return card;
}
