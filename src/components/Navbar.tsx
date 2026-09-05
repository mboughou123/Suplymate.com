"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  MessageSquare,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Factory,
  Sparkles,
  Heart,
  Settings,
  LogOut,
  Package,
  FileText,
  type LucideIcon,
} from "lucide-react";
import CartButton from "@/components/cart/CartButton";
import LanguageSelector from "@/components/LanguageSelector";
import { isSupplierRole } from "@/lib/roles";

type PublicLink = {
  href: string;
  key: "suppliers" | "materials" | "aiAssistant" | "pricing" | "blog" | "about" | "careers";
};

const PUBLIC_LINKS: PublicLink[] = [
  { href: "/suppliers", key: "suppliers" },
  { href: "/materials", key: "materials" },
  { href: "/ai-assistant", key: "aiAssistant" },
  { href: "/pricing", key: "pricing" },
  { href: "/blog", key: "blog" },
  { href: "/about", key: "about" },
  { href: "/careers", key: "careers" },
];

type MenuItem = { href: string; label: string; icon: LucideIcon };

export default function Navbar() {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const supplier = isSupplierRole(session?.user?.role);

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
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const authPaths = ["/login", "/signup", "/forgot-password"];
  if (authPaths.includes(pathname)) return null;

  const accountItems: MenuItem[] = supplier
    ? [
        { href: "/supplier-dashboard", label: t("supplierWorkspace"), icon: LayoutDashboard },
        { href: "/supplier-dashboard/products", label: t("myProducts"), icon: Package },
        { href: "/supplier-dashboard/rfqs", label: t("rfqs"), icon: FileText },
        { href: "/messages", label: t("messages"), icon: MessageSquare },
        { href: "/settings", label: t("settings"), icon: Settings },
      ]
    : [
        { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/suppliers", label: t("suppliers"), icon: Factory },
        { href: "/ai-assistant", label: t("aiAssistant"), icon: Sparkles },
        { href: "/messages", label: t("messages"), icon: MessageSquare },
        { href: "/saved", label: t("saved"), icon: Heart },
        { href: "/settings", label: t("settings"), icon: Settings },
      ];

  const name = session?.user?.name ?? "";
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071521]/95 text-white shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display inline-flex shrink-0 items-center gap-2 text-xl font-bold">
          <span>
            <span className="text-white">{t("brandSuply")}</span>
            <span className="gradient-text-light">{t("brandMate")}</span>
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-glow align-middle animate-glow-pulse" />
          </span>
          <span
            className="rounded-md border border-cyan-glow/35 bg-cyan/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-glow"
            aria-label="Beta"
          >
            Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href) ? "bg-white/10 text-cyan-glow" : "text-white/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <LanguageSelector />
          </div>
          {!supplier && <CartButton />}
          {status === "loading" ? (
            <span className="hidden h-9 w-24 sm:block" />
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
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 transition hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan/25 text-[11px] font-bold text-cyan-glow">
                    {initials}
                  </span>
                  <span className="max-w-[8rem] truncate text-sm font-medium">{name.split(" ")[0]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/60 transition ${menuOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 text-ink shadow-cardHover">
                    <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-ink-dim">{session.user.email}</p>
                    {accountItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
                      >
                        <item.icon className="h-4 w-4 text-cyan" aria-hidden />
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2 text-left text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      {t("signOut")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white sm:inline-block">
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
            className="rounded-lg p-2 text-white lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t("toggleMenu")}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 bg-[#071521] px-4 py-4 lg:hidden" aria-label="Mobile">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive(link.href) ? "text-cyan-glow" : "text-white/85 hover:bg-white/5"}`}
            >
              {t(link.key)}
            </Link>
          ))}

          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-3 px-1">
              <LanguageSelector variant="mobile" />
            </div>
            {session?.user ? (
              <>
                {accountItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/5"
                  >
                    <item.icon className="h-4 w-4 text-cyan-glow" aria-hidden />
                    {item.label}
                    {item.href === "/messages" && unread > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-glow px-1.5 text-[11px] font-bold text-navy-dark">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="mt-2 w-full rounded-lg border border-white/20 px-3 py-2.5 text-sm text-white/80"
                >
                  {t("signOut")}
                </button>
              </>
            ) : (
              <div className="grid gap-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg border border-white/20 px-3 py-2.5 text-center text-sm font-semibold text-white">
                  {t("login")}
                </Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="block rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-navy-dark">
                  {t("getStarted")}
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
