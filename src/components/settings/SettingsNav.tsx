"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  User,
  ShieldCheck,
  CreditCard,
  SlidersHorizontal,
  Users,
  ArrowLeft,
} from "lucide-react";

const TABS = [
  { href: "/settings", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/settings/account", label: "Account", icon: User },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/security", label: "Security", icon: ShieldCheck },
  { href: "/settings/subscription", label: "Subscription", icon: CreditCard },
  { href: "/settings/preferences", label: "Preferences", icon: SlidersHorizontal },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:sticky lg:top-8 lg:self-start">
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to dashboard
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
