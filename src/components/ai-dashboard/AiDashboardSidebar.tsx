"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Factory,
  Sparkles,
  MessageSquare,
  Heart,
  TrendingUp,
  FileText,
  BarChart3,
  Settings,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suppliers", label: "Suppliers", icon: Factory },
  { href: "/ai-assistant", label: "Procurement AI", icon: Sparkles, active: true },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/suppliers", label: "Saved suppliers", icon: Heart },
  { href: "/price-charts", label: "Market prices", icon: TrendingUp },
  { href: "/messages", label: "RFQs", icon: FileText },
  { href: "/price-charts", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AiDashboardSidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-ai-glow/20">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-ink">Suplymate AI</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-dim hover:bg-slate-100 lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.active ?? (pathname === item.href || pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.label} href={item.href} onClick={onClose}>
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
          <p className="text-xs font-semibold text-ink">Plan &amp; billing</p>
          <p className="mt-0.5 text-[11px] text-ink-dim">Manage your subscription</p>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="ai-glass hidden h-full w-60 shrink-0 border-r border-slate-200/60 lg:block xl:w-64">
        {content}
      </aside>

      {/* Mobile drawer */}
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
