"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  Factory,
  Package,
  TrendingUp,
  Bot,
  ChevronDown,
  Menu,
  X,
  MessageSquare,
  Bell,
  type LucideIcon,
} from "lucide-react";
import CartButton from "@/components/cart/CartButton";
import LanguageSelector from "@/components/LanguageSelector";

type NavItem = {
  href: string;
  labelKey: "suppliers" | "products" | "priceCharts" | "aiAssistant";
  descriptionKey:
    | "suppliersDescription"
    | "productsDescription"
    | "priceChartsDescription"
    | "aiAssistantDescription";
  icon: LucideIcon;
};

type NavCategory = {
  key: string;
  labelKey: "sourcing" | "marketIntelligence";
  items: NavItem[];
};

const categories: NavCategory[] = [
  {
    key: "sourcing",
    labelKey: "sourcing",
    items: [
      {
        href: "/suppliers",
        labelKey: "suppliers",
        descriptionKey: "suppliersDescription",
        icon: Factory,
      },
      {
        href: "/products",
        labelKey: "products",
        descriptionKey: "productsDescription",
        icon: Package,
      },
    ],
  },
  {
    key: "intelligence",
    labelKey: "marketIntelligence",
    items: [
      {
        href: "/price-charts",
        labelKey: "priceCharts",
        descriptionKey: "priceChartsDescription",
        icon: TrendingUp,
      },
      {
        href: "/ai-assistant",
        labelKey: "aiAssistant",
        descriptionKey: "aiAssistantDescription",
        icon: Bot,
      },
    ],
  },
];

const directLinks = [{ href: "/pricing", labelKey: "pricing" as const }];

export default function Navbar() {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileCat, setMobileCat] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setUnread(0);
      return;
    }
    let active = true;
    const fetchUnread = () =>
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : { unread: 0 }))
        .then((d) => active && setUnread(d.unread ?? 0))
        .catch(() => {});
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileCat(null);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const authPaths = ["/login", "/signup", "/forgot-password"];
  if (authPaths.includes(pathname)) return null;

  const isCategoryActive = (cat: NavCategory) =>
    cat.items.some((i) => pathname === i.href);

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-navy-dark to-navy text-white shadow-sm"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl font-bold shrink-0">
          <span className="text-white">{t("brandSuply")}</span>
          <span className="gradient-text-light">{t("brandMate")}</span>
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-glow align-middle animate-glow-pulse" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {categories.map((cat) => {
            const active = isCategoryActive(cat);
            const isOpen = openMenu === cat.key;
            return (
              <div
                key={cat.key}
                className="relative"
                onMouseEnter={() => setOpenMenu(cat.key)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : cat.key)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active || isOpen
                      ? "text-cyan-glow"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {t(cat.labelKey)}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-full w-80 pt-2">
                    <div className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-cardHover">
                      {cat.items.map((item) => {
                        const itemActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${
                              itemActive ? "bg-cyan/5" : "hover:bg-slate-50"
                            }`}
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan/20 bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
                              <item.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-ink">
                                {t(item.labelKey)}
                              </span>
                              <span className="block text-xs leading-snug text-ink-muted">
                                {t(item.descriptionKey)}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {directLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-cyan-glow" : "text-white/80 hover:text-white"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LanguageSelector />
          </div>
          <CartButton />
          {status === "loading" ? (
            <span className="hidden h-9 w-20 sm:block" />
          ) : session?.user ? (
            <>
              <Link
                href="/notifications"
                aria-label={t("notifications")}
                className="relative hidden rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <Bell className="h-5 w-5" aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-glow px-1 text-[10px] font-bold text-navy-dark">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link
                href="/messages"
                aria-label={t("messages")}
                className="hidden rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <MessageSquare className="h-5 w-5" aria-hidden />
              </Link>
              <Link
                href="/dashboard"
                className="hidden rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-cyan-glow hover:bg-white/15 sm:inline-block"
              >
                {t("dashboard")}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 sm:inline-block"
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-dark transition hover:bg-cyan-glow hover:text-navy-dark sm:inline-block"
            >
              {t("login")}
            </Link>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-white md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t("toggleMenu")}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 bg-navy-dark px-4 py-4 md:hidden">
          {categories.map((cat) => {
            const expanded = mobileCat === cat.key;
            return (
              <div key={cat.key} className="border-b border-white/5 py-1">
                <button
                  type="button"
                  onClick={() => setMobileCat(expanded ? null : cat.key)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-white"
                >
                  {t(cat.labelKey)}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {expanded &&
                  cat.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 pl-5 text-sm text-white/80 hover:bg-white/5"
                    >
                      <item.icon className="h-4 w-4 text-cyan-glow" aria-hidden />
                      {t(item.labelKey)}
                    </Link>
                  ))}
              </div>
            );
          })}

          {directLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="mt-1 block rounded-lg px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
            >
              {t(link.labelKey)}
            </Link>
          ))}

          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-3 px-1">
              <LanguageSelector variant="mobile" />
            </div>
            {session?.user ? (
              <>
                <Link
                  href="/messages"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-cyan-glow"
                >
                  <span className="inline-flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    {t("messages")}
                  </span>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-glow px-1.5 text-[11px] font-bold text-navy-dark">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-cyan-glow"
                >
                  {t("dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="mt-2 w-full rounded-lg border border-white/20 px-3 py-2.5 text-sm text-white/80"
                >
                  {t("signOut")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-navy-dark"
              >
                {t("login")}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
