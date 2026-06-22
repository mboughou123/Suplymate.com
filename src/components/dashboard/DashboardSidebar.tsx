"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Factory,
  Package,
  Sparkles,
  FileText,
  MessageSquare,
  TrendingUp,
  Heart,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suppliers", label: "Suppliers", icon: Factory },
  { href: "/products", label: "Products", icon: Package },
  { href: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/messages", label: "Messages & RFQs", icon: MessageSquare },
  { href: "/price-charts", label: "Price Tracking", icon: TrendingUp },
  { href: "/suppliers", label: "Saved Suppliers", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Props = {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
};

export default function DashboardSidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: Props) {
  const pathname = usePathname();

  const inner = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold text-sm font-bold text-ink">
            S
          </span>
          {!collapsed && (
            <span className="font-display text-sm font-bold text-ink">
              Suply<span className="text-gold">mate</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-dim transition hover:bg-slate-100 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-1.5 text-ink-dim transition hover:bg-slate-100 lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              title={item.label}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-gold/10 text-ink"
                  : "text-ink-muted hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold" />
              )}
              <item.icon
                className={`h-4 w-4 shrink-0 ${active ? "text-gold" : "text-ink-dim"}`}
                aria-hidden
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-100 p-4">
          <Link
            href="/settings/subscription"
            onClick={onClose}
            className="block rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-gold/40 hover:bg-gold/5"
          >
            <p className="text-[11px] font-semibold text-ink">Plan &amp; billing</p>
            <p className="text-[10px] text-ink-dim">Manage your subscription</p>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-all duration-300 lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {inner}
      </aside>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white lg:hidden">
            {inner}
          </aside>
        </>
      )}
    </>
  );
}
