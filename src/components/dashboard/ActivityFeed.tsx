"use client";

import Link from "next/link";
import { Sparkles, MessageCircle, TrendingUp, Truck, Factory } from "lucide-react";
import type { ActivityItem } from "./types";

const ICONS = {
  ai: Sparkles,
  quote: MessageCircle,
  price: TrendingUp,
  shipping: Truck,
  supplier: Factory,
};

const STATUS_COLORS = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-gold",
};

type Props = {
  items: ActivityItem[];
};

export default function ActivityFeed({ items }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold text-ink">Workspace activity</h2>
      <p className="text-[11px] text-ink-dim">Based on your account</p>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-0">
          {items.map((item) => {
            const Icon = ICONS[item.type];
            return (
              <li
                key={item.id}
                className="relative flex gap-3 border-l border-slate-200 py-3 pl-5 last:pb-0"
              >
                <span
                  className={`absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full ${
                    item.status ? STATUS_COLORS[item.status] : "bg-slate-300"
                  } ring-4 ring-white`}
                />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Icon className="h-4 w-4 text-gold" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                    {item.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink-muted">No activity yet</p>
          <p className="mt-1 text-xs text-ink-dim">
            Start a supplier conversation, create an RFQ, or set a price alert to
            see updates here.
          </p>
          <Link
            href="/suppliers"
            className="mt-3 inline-block text-xs font-semibold text-gold hover:underline"
          >
            Browse suppliers
          </Link>
        </div>
      )}
    </section>
  );
}
