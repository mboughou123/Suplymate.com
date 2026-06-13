"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Menu,
  Sparkles,
  Plus,
  ChevronDown,
  LogOut,
} from "lucide-react";
import type { DashboardUser } from "./types";

type Props = {
  user: DashboardUser;
  unreadNotifications: number;
  onMenuClick: () => void;
};

export default function DashboardTopbar({
  user,
  unreadNotifications,
  onMenuClick,
}: Props) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/5 bg-[#0B1220]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-white/60 hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden sm:block">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search suppliers, materials, RFQs…"
            className="w-56 rounded-xl border border-white/8 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/20 lg:w-72"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 md:inline-flex">
          <span className="h-1.5 w-1.5 animate-ai-pulse rounded-full bg-emerald-400" />
          AI Active
        </span>

        <Link
          href="/ai-assistant"
          className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold/20 to-ai-glow/10 px-3 py-2 text-xs font-semibold text-gold transition hover:from-gold/30 sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Quick action
        </Link>

        <Link
          href="/messages"
          className="relative rounded-xl p-2.5 text-white/60 transition hover:bg-white/5 hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-[#0B1220]">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <div className="group relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-2 py-1.5 transition hover:bg-white/8"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold/40 to-navy-mid text-xs font-bold text-white">
              {initials}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-white leading-tight">
                {user.name.split(" ")[0]}
              </p>
              <p className="text-[10px] text-white/40">
                {user.company ?? "Workspace"}
              </p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-white/40 sm:block" />
          </button>
          <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#141C2B] py-1 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
            <p className="border-b border-white/5 px-3 py-2 text-[11px] text-white/50">
              {user.email}
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
