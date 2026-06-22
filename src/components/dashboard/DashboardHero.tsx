"use client";

import Link from "next/link";
import { Sparkles, Factory, MessageSquare } from "lucide-react";

type Props = {
  firstName: string;
  supplierCount: number;
  conversationCount: number;
};

export default function DashboardHero({
  firstName,
  supplierCount,
  conversationCount,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Here&apos;s an overview of your procurement workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-ink-muted">
              <Factory className="h-3 w-3 text-gold" aria-hidden />
              {supplierCount.toLocaleString()} suppliers indexed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-ink-muted">
              <MessageSquare className="h-3 w-3 text-gold" aria-hidden />
              {conversationCount} active conversation{conversationCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <Link
          href="/ai-assistant"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink transition hover:bg-gold-light"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask the AI assistant
        </Link>
      </div>
    </section>
  );
}
