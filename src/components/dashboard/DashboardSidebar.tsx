"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Factory,
  Package,
  Sparkles,
  FileText,
  MessageSquare,
  TrendingUp,
  BarChart3,
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
  { href: "/messages", label: "RFQs", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/price-charts", label: "Price Tracking", icon: TrendingUp },
  { href: "/price-charts", label: "Analytics", icon: BarChart3 },
  { href: "/suppliers", label: "Saved Suppliers", icon: Heart },
  { href: "/dashboard", label: "Settings", icon: Settings },
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold/30 to-ai-glow/20 shadow-gold">
            <span className="text-xs font-bold text-white">S</span>
          </span>
          {!collapsed && (
            <span className="font-display text-sm font-bold text-white">
              Suply<span className="text-gold">mate</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-1.5 text-white/50 hover:bg-white/5 lg:block"
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
            <Link key={item.label} href={item.href} onClick={onClose} title={item.label}>
              <motion.span
                whileHover={{ x: collapsed ? 0 : 3 }}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/8 text-white shadow-[inset_0_0_20px_rgba(212,175,55,0.08)]"
                    : "text-white/55 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dash-nav-glow"
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gradient-to-b from-gold to-ai-glow shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                  />
                )}
                <item.icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-gold" : ""}`}
                  aria-hidden
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </motion.span>
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/5 p-4">
          <div className="rounded-xl border border-gold/20 bg-gold/5 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-gold">Enterprise</p>
            <p className="text-[10px] text-white/45">Global procurement OS</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden h-screen shrink-0 border-r border-white/5 bg-gradient-to-b from-[#0A1018] to-[#0D1520] transition-all duration-300 lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {inner}
      </aside>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/5 bg-gradient-to-b from-[#0A1018] to-[#0D1520] lg:hidden"
          >
            {inner}
          </motion.aside>
        </>
      )}
    </>
  );
}
