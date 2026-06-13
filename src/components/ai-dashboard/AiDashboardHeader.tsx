"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Menu,
  Sparkles,
} from "lucide-react";

type Props = {
  aiMode: "demo" | "openai";
  onMenuClick: () => void;
};

export default function AiDashboardHeader({ aiMode, onMenuClick }: Props) {
  const { data: session } = useSession();
  const initials = (session?.user?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="ai-glass flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/60 px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-ink-muted hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative shrink-0">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/30 via-ai-glow/20 to-cyan/10 shadow-gold"
          >
            <Sparkles className="h-5 w-5 text-gold" aria-hidden />
          </motion.div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
            AI Procurement Assistant
          </h1>
          <p className="truncate text-xs text-ink-dim sm:text-sm">
            Source smarter with AI-powered supplier intelligence.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-ai-pulse rounded-full bg-emerald-500" />
          AI Active
        </span>

        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search suppliers, materials…"
            className="w-48 rounded-xl border border-slate-200/80 bg-white/60 py-2 pl-9 pr-3 text-sm backdrop-blur-sm transition focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20 lg:w-56"
          />
        </div>

        <button
          type="button"
          className="relative rounded-xl p-2.5 text-ink-muted transition hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" />
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/50 px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-mid text-xs font-bold text-white">
            {initials}
          </span>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-ink leading-tight">
              {session?.user?.name ?? "Guest"}
            </p>
            <p className="text-[10px] text-ink-dim">
              {aiMode === "openai" ? "Live AI" : "Demo mode"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
