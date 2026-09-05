"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { signOut } from "next-auth/react";
import {
  Search,
  Bell,
  Menu,
  Plus,
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
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
  const t = useTranslations("common");
  const nav = useTranslations("navigation");
  const settings = useTranslations("settings");
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/suppliers?q=${encodeURIComponent(q)}` : "/suppliers");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-muted transition hover:bg-slate-100 lg:hidden"
          aria-label={nav("toggleMenu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={submitSearch} className="relative hidden sm:block">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-dim transition focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/15 lg:w-72"
          />
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/ai-assistant"
          className="hidden items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-mid sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {nav("aiAssistant")}
        </Link>

        <Link
          href="/notifications"
          className="relative rounded-lg p-2.5 text-ink-muted transition hover:bg-slate-100 hover:text-ink"
          aria-label={nav("notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan px-1 text-[9px] font-bold text-white">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-soft text-xs font-bold text-cyan">
              {initials}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight text-ink">
                {user.name.split(" ")[0]}
              </p>
              {user.company && (
                <p className="text-[10px] text-ink-dim">{user.company}</p>
              )}
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-ink-dim sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-card">
              <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-ink-dim">
                {user.email}
              </p>
              <Link
                href="/settings/account"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
              >
                <UserIcon className="h-4 w-4" aria-hidden />
                {t("name")}
              </Link>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
              >
                <Settings className="h-4 w-4" aria-hidden />
                {settings("title")}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {nav("signOut")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
