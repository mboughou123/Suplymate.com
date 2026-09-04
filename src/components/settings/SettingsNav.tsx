"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutGrid,
  User,
  Building2,
  CreditCard,
  Bell,
  ShieldCheck,
  Users,
  ArrowLeft,
} from "lucide-react";

export default function SettingsNav({ isSupplier }: { isSupplier: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("settings");

  const TABS = [
    { href: "/settings", label: t("overview"), icon: LayoutGrid, exact: true },
    { href: "/settings/account", label: t("account"), icon: User },
    { href: "/settings/business", label: t("business"), icon: Building2 },
    { href: "/settings/subscription", label: t("subscription"), icon: CreditCard },
    { href: "/settings/notifications", label: t("notifications"), icon: Bell },
    { href: "/settings/security", label: t("security"), icon: ShieldCheck },
    { href: "/settings/team", label: t("team"), icon: Users },
  ];

  return (
    <nav className="lg:sticky lg:top-8 lg:self-start">
      <Link
        href={isSupplier ? "/supplier-dashboard" : "/dashboard"}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {isSupplier ? t("supplierWorkspace") : t("buyerDashboard")}
      </Link>
      <ul className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card lg:flex-col lg:overflow-visible">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="shrink-0 lg:shrink">
              <Link
                href={tab.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-navy text-white shadow-sm" : "text-ink-muted hover:bg-slate-100 hover:text-ink"
                }`}
              >
                <tab.icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-glow" : "text-ink-dim"}`} aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
