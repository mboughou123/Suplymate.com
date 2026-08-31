"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

const LINKS = [
  { href: "/suppliers", key: "suppliers" as const },
  { href: "/products", key: "products" as const },
  { href: "/price-charts", key: "priceCharts" as const },
  { href: "/ai-assistant", key: "aiAssistant" as const },
];

export default function HomeTopNav() {
  const t = useTranslations("homeTopNav");
  const nav = useTranslations("navigation");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToDemo = () => {
    setOpen(false);
    document.getElementById("ai-demo-walkthrough")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => document.getElementById("ai-demo-run")?.focus(), 450);
  };

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div
        className={`pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/85 px-4 py-2.5 shadow-glass backdrop-blur-xl transition-all duration-300 sm:px-5 ${
          scrolled ? "shadow-glow-panel ring-1 ring-cyan/10" : ""
        }`}
      >
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink">
          {nav("brandSuply")}
          <span className="gradient-text">{nav("brandMate")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("mainNav")}>
          {LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-slate-50 hover:text-ink"
            >
              {nav(key)}
            </Link>
          ))}
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-slate-50 hover:text-ink"
          >
            {nav("pricing")}
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSelector variant="inline" />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
          >
            {t("logIn")}
          </Link>
          <button type="button" onClick={scrollToDemo} className="btn-accent px-4 py-2 text-sm">
            {t("requestDemo")}
          </button>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-ink-muted md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={nav("toggleMenu")}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="pointer-events-auto mx-auto mt-2 max-w-6xl rounded-2xl border border-white/80 bg-white/85 p-4 shadow-glass backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink"
              >
                {nav(key)}
              </Link>
            ))}
            <Link href="/pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink">
              {nav("pricing")}
            </Link>
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            <LanguageSelector />
            <Link href="/login" className="btn-secondary justify-center py-2.5 text-sm">
              {t("logIn")}
            </Link>
            <button type="button" onClick={scrollToDemo} className="btn-accent justify-center py-2.5 text-sm">
              {t("requestDemo")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}