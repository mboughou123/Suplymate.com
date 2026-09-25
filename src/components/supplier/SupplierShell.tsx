"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Building2,
  Package,
  FileText,
  MessageSquare,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ExternalLink,
  BadgeCheck,
  Clock,
  type LucideIcon,
} from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

type Props = {
  children: React.ReactNode;
  user: { name: string; email: string };
  profile: { id: string; name: string; verified: boolean; verificationStatus: string } | null;
};

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export default function SupplierShell({ children, user, profile }: Props) {
  const t = useTranslations("supplierDashboard");
  const nav = useTranslations("navigation");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: Item[] = [
    { href: "/supplier-dashboard", label: t("overview"), icon: LayoutDashboard, exact: true },
    { href: "/supplier-dashboard/profile", label: t("companyProfile"), icon: Building2 },
    { href: "/supplier-dashboard/products", label: t("products"), icon: Package },
    { href: "/supplier-dashboard/rfqs", label: t("rfqs"), icon: FileText },
    { href: "/messages", label: t("messages"), icon: MessageSquare },
    { href: "/supplier-dashboard/customers", label: t("customers"), icon: Users },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S";

  const sidebar = (
    <div className="flex h-full flex-col bg-[#071521] text-white">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          {nav("brandSuply")}
          <span className="gradient-text-light">{nav("brandMate")}</span>
          <span className="ml-2 rounded-md border border-cyan-glow/30 bg-cyan/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-glow">
            Supplier
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 lg:hidden"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {profile && (
        <div className="mx-4 mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="truncate text-sm font-semibold">{profile.name}</p>
          <p
            className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${
              profile.verified ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {profile.verified ? (
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Clock className="h-3.5 w-3.5" aria-hidden />
            )}
            {profile.verified ? t("statusVerified") : t("statusPending")}
          </p>
          {profile.verified && (
            <Link
              href={`/supplier/${profile.id}`}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-glow hover:underline"
            >
              {t("viewPublicProfile")}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan-glow" />}
              <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-glow" : ""}`} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan/20 text-xs font-bold text-cyan-glow">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-[11px] text-white/50">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label={nav("signOut")}
            title={nav("signOut")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7FA] text-ink">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden">{sidebar}</aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-ink-muted hover:bg-slate-100 lg:hidden"
              aria-label={nav("toggleMenu")}
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-semibold text-ink">{t("title")}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="inline" />
            <Link href="/suppliers" className="btn-secondary hidden px-3 py-2 text-xs sm:inline-flex">
              {nav("suppliers")}
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
