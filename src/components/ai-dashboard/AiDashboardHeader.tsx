"use client";

import { useSession } from "next-auth/react";
import { Menu, Sparkles } from "lucide-react";

type Props = {
  aiMode: "demo" | "openai";
  onMenuClick: () => void;
};

export default function AiDashboardHeader({ aiMode, onMenuClick }: Props) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "";
  const firstName = name.split(" ")[0] || "Guest";
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-ink-muted transition hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15">
          <Sparkles className="h-5 w-5 text-gold" aria-hidden />
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
            AI Procurement Assistant
          </h1>
          <p className="truncate text-xs text-ink-dim">
            Supplier intelligence, pricing &amp; sourcing help
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
            aiMode === "openai"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-ink-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              aiMode === "openai" ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {aiMode === "openai" ? "Live AI" : "Demo mode"}
        </span>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 text-xs font-bold text-ink">
            {initials}
          </span>
          <span className="hidden text-xs font-semibold text-ink sm:block">
            {firstName}
          </span>
        </div>
      </div>
    </header>
  );
}
