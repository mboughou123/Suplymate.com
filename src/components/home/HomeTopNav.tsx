"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import { homeForRole } from "@/lib/roles";

const LINKS = [
  { href: "/suppliers", key: "suppliers" as const },
  { href: "/materials", key: "materials" as const },
  { href: "/ai-assistant", key: "aiAssistant" as const },
  { href: "/pricing", key: "pricing" as const },
  { href: "/blog", key: "blog" as const },
  { href: "/about", key: "about" as const },
];

export default function HomeTopNav() {
  const nav = useTranslations("navigation");
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signedIn = status === "authenticated" && Boolean(session?.user);
  const home = homeForRole(session?.user?.role);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div
        className={`pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-5 ${
          scrolled
            ? "border-white/70 bg-white/85 text-ink shadow-glass"
            : "border-white/10 bg-white/[0.06] text-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]"
        }`}
      >
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          {nav("brandSuply")}
          <span className={scrolled ? "gradient-text" : "gradient-text-light"}>{nav("brandMate")}</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                scrolled ? "text-ink-muted hover:bg-slate-50 hover:text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {nav(key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSelector variant={scrolled ? "inline" : "navbar"} />
          {signedIn ? (
            <Link href={home} className={scrolled ? "btn-primary px-4 py-2 text-sm" : "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-cyan-glow"}>
              {nav("dashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${scrolled ? "text-ink-muted hover:text-ink" : "text-white/80 hover:text-white"}`}
              >
                {nav("login")}
              </Link>
              <Link
                href="/signup"
                className={scrolled ? "btn-primary px-4 py-2 text-sm" : "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-cyan-glow"}
              >
                {nav("getStarted")}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={`rounded-lg p-2 lg:hidden ${scrolled ? "text-ink-muted" : "text-white"}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={nav("toggleMenu")}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="pointer-events-auto mx-auto mt-2 max-w-6xl rounded-2xl border border-white/80 bg-white/95 p-4 shadow-glass backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {LINKS.map(({ href, key }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink">
                {nav(key)}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <LanguageSelector />
            {signedIn ? (
              <Link href={home} onClick={() => setOpen(false)} className="btn-primary justify-center py-2.5 text-sm">
                {nav("dashboard")}
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary justify-center py-2.5 text-sm">
                  {nav("login")}
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary justify-center py-2.5 text-sm">
                  {nav("getStarted")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
