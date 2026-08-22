"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import ThemeToggle from "@/components/ThemeToggle";
import { isRtlLocale } from "@/i18n/routing";

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
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileCat, setMobileCat] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const itemRefs = useRef(new Map<string, HTMLAnchorElement[]>());
  const isRtl = isRtlLocale(locale);

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
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 12);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  const focusItem = (categoryKey: string, index: number) => {
    requestAnimationFrame(() => itemRefs.current.get(categoryKey)?.[index]?.focus());
  };

  const openAndFocus = (categoryKey: string, index: number) => {
    setOpenMenu(categoryKey);
    focusItem(categoryKey, index);
  };

  const focusAdjacentTrigger = (categoryKey: string, direction: -1 | 1) => {
    const current = categories.findIndex((category) => category.key === categoryKey);
    const next = (current + direction + categories.length) % categories.length;
    triggerRefs.current.get(categories[next].key)?.focus();
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    category: NavCategory,
  ) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      openAndFocus(category.key, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAndFocus(category.key, category.items.length - 1);
    } else if (event.key === "Escape") {
      setOpenMenu(null);
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const visualDirection = event.key === "ArrowRight" ? 1 : -1;
      focusAdjacentTrigger(category.key, (isRtl ? -visualDirection : visualDirection) as -1 | 1);
    }
  };

  const handleItemKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    category: NavCategory,
    itemIndex: number,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpenMenu(null);
      triggerRefs.current.get(category.key)?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = (itemIndex + direction + category.items.length) % category.items.length;
      focusItem(category.key, next);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusItem(category.key, event.key === "Home" ? 0 : category.items.length - 1);
    }
  };

  const authPaths = ["/login", "/signup", "/forgot-password"];
  if (authPaths.includes(pathname)) return null;

  const isCategoryActive = (cat: NavCategory) =>
    cat.items.some((i) => pathname === i.href);

  return (
    <motion.header
      ref={navRef}
      initial={false}
      animate={{
        backgroundColor: scrolled ? "rgba(9, 30, 66, 0.97)" : "rgba(9, 30, 66, 0.92)",
        borderColor: scrolled ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.08)",
        boxShadow: scrolled ? "0 6px 18px rgba(9, 30, 66, 0.12)" : "0 1px 2px rgba(9, 30, 66, 0.06)",
      }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
      className="sticky top-0 z-50 border-b text-white backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display inline-flex shrink-0 items-center gap-2 text-xl font-bold">
          <span>
            <span className="text-white">{t("brandSuply")}</span>
            <span className="gradient-text-light">{t("brandMate")}</span>
            <span className="ms-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-glow align-middle animate-glow-pulse" />
          </span>
          <span
            className="rounded-md border border-cyan-glow/35 bg-cyan/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-glow"
            aria-label="Beta"
          >
            Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {categories.map((cat) => {
            const active = isCategoryActive(cat);
            const isOpen = openMenu === cat.key;
            return (
              <div key={cat.key} className="relative">
                <button
                  id={`${cat.key}-trigger`}
                  ref={(node) => {
                    if (node) triggerRefs.current.set(cat.key, node);
                    else triggerRefs.current.delete(cat.key);
                  }}
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : cat.key)}
                  onKeyDown={(event) => handleTriggerKeyDown(event, cat)}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  aria-controls={`${cat.key}-menu`}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow ${
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
                  <div className="absolute start-0 top-full w-80 pt-2">
                    <div
                      id={`${cat.key}-menu`}
                      role="menu"
                      aria-labelledby={`${cat.key}-trigger`}
                      className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-cardHover"
                    >
                      {cat.items.map((item) => {
                        const itemActive = pathname === item.href;
                        const itemIndex = cat.items.indexOf(item);
                        return (
                          <Link
                            ref={(node) => {
                              const refs = itemRefs.current.get(cat.key) ?? [];
                              if (node) refs[itemIndex] = node;
                              else refs.splice(itemIndex, 1);
                              itemRefs.current.set(cat.key, refs);
                            }}
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onKeyDown={(event) => handleItemKeyDown(event, cat, itemIndex)}
                            className={`flex items-start gap-3 rounded-xl p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan ${
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
          <ThemeToggle />
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
                  <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-glow px-1 text-[10px] font-bold text-navy-dark">
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
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white sm:inline-block"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-dark transition hover:bg-cyan-glow sm:inline-block"
              >
                {t("getStarted")}
              </Link>
            </>
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
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 ps-5 text-sm text-white/80 hover:bg-white/5"
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
            <ThemeToggle variant="mobile" />
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
    </motion.header>
  );
}
