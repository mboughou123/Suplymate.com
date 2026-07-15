"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Factory,
  Sparkles,
  MessageSquare,
  Heart,
  TrendingUp,
  FileText,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AiDashboardSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const nav = useTranslations("navigation");
  const settings = useTranslations("settings");
  const rfqs = useTranslations("rfqs");
  const common = useTranslations("common");

  const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: nav("dashboard"), icon: LayoutDashboard },
    { href: "/suppliers", label: nav("suppliers"), icon: Factory },
    { href: "/ai-assistant", label: nav("aiAssistant"), icon: Sparkles, active: true },
    { href: "/messages", label: nav("messages"), icon: MessageSquare },
    { href: "/suppliers", label: nav("suppliers"), icon: Heart },
    { href: "/price-charts", label: nav("priceCharts"), icon: TrendingUp },
    { href: "/messages", label: rfqs("title"), icon: FileText },
    { href: "/settings", label: settings("title"), icon: Settings },
  ];

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-ai-glow/20">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-ink">
            {nav("brandSuply")}
            {nav("brandMate")}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-dim hover:bg-slate-100 lg:hidden"
          aria-label={common("close")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item, index) => {
          const isActive =
            item.active ?? (pathname === item.href || pathname.startsWith(`${item.href}/`));
          return (
            <Link key={`${item.href}-${index}`} href={item.href} onClick={onClose}>
              <motion.span
                whileHover={{ x: 2 }}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-gold/10 via-ai-mist/50 to-transparent text-ink shadow-sm"
                    : "text-ink-muted hover:bg-slate-100/80 hover:text-ink"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-glow"
                    className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-gradient-to-b from-gold to-ai-glow"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-gold" : "text-ink-dim group-hover:text-ink-muted"
                  }`}
                  aria-hidden
                />
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/60 p-4">
        <Link
          href="/settings/subscription"
          onClick={onClose}
          className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-gold/40 hover:bg-gold/5"
        >
          <p className="text-xs font-semibold text-ink">{nav("pricing")}</p>
          <p className="mt-0.5 text-[11px] text-ink-dim">{common("learnMore")}</p>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="ai-glass hidden h-full w-60 shrink-0 border-r border-slate-200/60 lg:block xl:w-64">
        {content}
      </aside>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="ai-glass fixed inset-y-0 left-0 z-50 w-72 shadow-ai-glow lg:hidden"
          >
            {content}
          </motion.aside>
        </>
      )}
    </>
  );
}
