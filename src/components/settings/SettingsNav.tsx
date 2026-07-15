"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutGrid,
  User,
  ShieldCheck,
  CreditCard,
  SlidersHorizontal,
  Users,
  ArrowLeft,
} from "lucide-react";

export default function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations("settings");
  const nav = useTranslations("navigation");
  const dashboard = useTranslations("dashboard");
  const common = useTranslations("common");

  const TABS = [
    { href: "/settings", label: t("title"), icon: LayoutGrid, exact: true },
    { href: "/settings/account", label: common("name"), icon: User },
    { href: "/settings/team", label: common("company"), icon: Users },
    { href: "/settings/security", label: t("title"), icon: ShieldCheck },
    { href: "/settings/subscription", label: nav("pricing"), icon: CreditCard },
    { href: "/settings/preferences", label: t("preferences"), icon: SlidersHorizontal },
  ];

  return (
    <nav className="lg:sticky lg:top-8 lg:self-start">
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {dashboard("title")}
      </Link>
      <ul className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 lg:flex-col lg:overflow-visible">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="shrink-0 lg:shrink">
              <Link
                href={tab.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-gold/10 text-ink"
                    : "text-ink-muted hover:bg-slate-100 hover:text-ink"
                }`}
              >
                <tab.icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-gold" : "text-ink-dim"}`}
                  aria-hidden
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
