"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import MegaMenu, { MegaMenuMobile } from "@/components/nav/MegaMenu";
import { homeForRole } from "@/lib/roles";

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

  const solidButton = scrolled
    ? "btn-primary whitespace-nowrap px-4 py-2 text-sm"
    : "inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-cyan-glow";
  const ghostButton = scrolled
    ? "inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200/90 bg-white/80 px-3.5 py-2 text-sm font-semibold text-ink-muted transition hover:border-cyan/30 hover:text-ink"
    : "inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/90 transition hover:border-white/35 hover:bg-white/10";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div
        className={`pointer-events-auto relative mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-5 ${
          scrolled
            ? "border-white/70 bg-white/85 text-ink shadow-glass"
            : "border-white/10 bg-white/[0.06] text-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]"
        }`}
      >
        <Link href="/" className="font-display inline-flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
          <span>
            {nav("brandSuply")}
            <span className={scrolled ? "gradient-text" : "gradient-text-light"}>{nav("brandMate")}</span>
          </span>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider lg:hidden xl:inline-block ${
              scrolled ? "border-cyan/25 bg-cyan-soft text-cyan" : "border-cyan-glow/35 bg-cyan/15 text-cyan-glow"
            }`}
            aria-label="Beta"
          >
            Beta
          </span>
        </Link>

        <MegaMenu tone={scrolled ? "light" : "dark"} className="hidden lg:flex" panelClassName="inset-x-0 top-full mt-2" />

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <LanguageSelector variant={scrolled ? "inline" : "navbar"} compactLabel />
          {signedIn ? (
            <Link href={home} className={solidButton}>
              {nav("dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className={ghostButton}>
                {nav("login")}
              </Link>
              <Link href="/signup" className={solidButton}>
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
        <div className="pointer-events-auto mx-auto mt-2 max-h-[calc(100vh-6rem)] max-w-6xl overflow-y-auto rounded-2xl border border-white/80 bg-white/95 p-4 shadow-glass backdrop-blur-xl lg:hidden">
          <MegaMenuMobile tone="light" onNavigate={() => setOpen(false)} />
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <LanguageSelector variant="inline" className="w-full" />
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
