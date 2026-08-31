"use client";

import { type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Search,
  Sparkles,
  BadgeCheck,
  ShieldCheck,
  Bot,
  Binoculars,
  Columns3,
  LineChart,
  Factory,
} from "lucide-react";
import TrustBadge from "@/components/TrustBadge";

export default function Hero() {
  const t = useTranslations("hero");
  const router = useRouter();

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    const query = typeof q === "string" ? q.trim() : "";
    router.push(query ? `/suppliers?q=${encodeURIComponent(query)}` : "/suppliers");
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-100/80 bg-azure-mist">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ai-grid-bg opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="absolute -top-48 left-1/2 h-[34rem] w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan/12 via-teal/8 to-transparent blur-3xl glow-azure-subtle" />
        <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/4 translate-y-1/4 rounded-full bg-navy/5 blur-3xl" />
      </div>

      <div className="relative container-page section-y-tight lg:py-section-lg">
        <div className="grid items-center gap-block-lg lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-2xl text-center lg:text-left">
            <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-cyan/25 bg-white/80 px-3.5 py-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-cyan shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("badge")}
            </span>

            <h1
              className="mt-6 animate-fade-up font-display text-display text-ink sm:text-display-lg lg:text-display-xl text-balance"
              style={{ animationDelay: "60ms" }}
            >
              {t.rich("title", {
                highlight: () => (
                  <span className="gradient-text">{t("titleHighlight")}</span>
                ),
              })}
            </h1>

            <p
              className="mx-auto mt-5 max-w-xl animate-fade-up text-body-lg text-ink-muted lg:mx-0"
              style={{ animationDelay: "120ms" }}
            >
              {t("subtitle")}
            </p>

            <form
              onSubmit={onSearch}
              className="panel-glass group mt-8 flex animate-fade-up flex-col gap-2 p-2 motion-safe:transition-shadow motion-safe:duration-300 focus-within:border-cyan/40 focus-within:shadow-glow-panel sm:flex-row"
              style={{ animationDelay: "180ms" }}
              role="search"
            >
              <div className="flex flex-1 items-center gap-2.5 px-3.5">
                <Search
                  className="h-5 w-5 shrink-0 text-ink-dim transition-colors group-focus-within:text-cyan"
                  aria-hidden
                />
                <label htmlFor="hero-search" className="sr-only">
                  {t("searchLabel")}
                </label>
                <input
                  id="hero-search"
                  type="search"
                  name="q"
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent py-3.5 text-body-sm text-ink placeholder:text-ink-dim focus:outline-none"
                />
              </div>
              <button type="submit" className="btn-accent px-7 py-3.5 sm:shrink-0">
                {t("searchButton")}
              </button>
            </form>

            <div
              className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/suppliers"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-cyan transition-colors hover:text-navy cursor-pointer"
              >
                <Factory className="h-4 w-4" aria-hidden />
                {t("findSuppliers")}
              </Link>
              <span aria-hidden className="hidden h-4 w-px bg-slate-200 sm:block" />
              <a
                href="#ai-demo-walkthrough"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-cyan transition-colors hover:text-navy cursor-pointer"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {t("tryWalkthrough")}
              </a>
            </div>

            <div
              className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-2.5 lg:justify-start"
              style={{ animationDelay: "300ms" }}
            >
              <TrustBadge icon={BadgeCheck} label={t("trustVerifiedNetwork")} />
              <TrustBadge icon={Bot} label={t("trustAiMatching")} />
              <TrustBadge icon={ShieldCheck} label={t("trustProcurementSupport")} />
            </div>
          </div>

          {/* TODO(supplier-imagery): Replace gradient placeholder with verified factory photography */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="panel-glass-dark relative aspect-[4/3] overflow-hidden glow-azure-subtle sm:aspect-[5/4]">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(56,189,248,0.18),transparent_55%)]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(20,184,166,0.12),transparent_50%)]"
                />
                <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-glow/80">
                      {t("visualEyebrow")}
                    </p>
                    <p className="mt-2 max-w-[16rem] text-sm font-medium leading-relaxed text-white/85">
                      {t("visualCaption")}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Binoculars, label: t("visualScout") },
                      { icon: Columns3, label: t("visualCompare") },
                      { icon: LineChart, label: t("visualWatch") },
                    ].map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center backdrop-blur-sm"
                      >
                        <Icon className="mx-auto h-5 w-5 text-cyan-glow" aria-hidden />
                        <p className="mt-1.5 text-[10px] font-semibold text-white/75">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute -left-2 top-5 w-52 rounded-xl panel-glass p-3 shadow-glow-panel sm:-left-4 sm:w-56 lg:-left-6">
                <div className="flex items-center gap-3">
                  {/* TODO(supplier-imagery): Supplier logo slot */}
                  <div
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-navy-mid text-xs font-bold text-white"
                  >
                    AG
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-ink">
                      {t("previewSupplierName")}
                    </p>
                    <p className="text-caption text-ink-muted">{t("previewSupplierRegion")}</p>
                  </div>
                  <span
                    className="ml-auto inline-flex items-center rounded-full bg-up-bg p-1 text-up"
                    aria-label={t("verifiedSupplier")}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-3 -right-1 w-52 rounded-xl panel-glass p-3 shadow-glow-panel sm:-bottom-4 sm:-right-3 sm:w-56">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-caption font-semibold text-ink">{t("aiMatchFound")}</p>
                    <p className="truncate text-caption text-ink-muted">{t("aiMatchDetail")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
