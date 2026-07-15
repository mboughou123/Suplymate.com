"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  Search,
  Sparkles,
  Package,
  BadgeCheck,
  TrendingDown,
  ShieldCheck,
  Bot,
  Star,
} from "lucide-react";
import TrustBadge from "@/components/TrustBadge";
import ImageWithFallback from "@/components/ImageWithFallback";
import {
  getProductFallbackImage,
  getSupplierFallbackImage,
} from "@/lib/image-fallback";

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden border-b border-slate-100">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ai-grid-bg opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan/10 via-teal/10 to-transparent blur-3xl" />
      </div>

      <div className="relative container-page py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="max-w-2xl text-center lg:text-left">
            <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-cyan/25 bg-cyan-soft px-3.5 py-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-cyan">
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
              action="/products"
              className="group mt-8 flex animate-fade-up flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-cardHover transition-shadow duration-300 focus-within:border-cyan/50 focus-within:shadow-[0_0_0_4px_rgba(3,105,161,0.10),0_16px_40px_-8px_rgba(15,23,42,0.14)] sm:flex-row"
              style={{ animationDelay: "180ms" }}
              role="search"
            >
              <div className="flex flex-1 items-center gap-2.5 px-3.5">
                <Search className="h-5 w-5 shrink-0 text-ink-dim transition-colors group-focus-within:text-cyan" aria-hidden />
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
              className="mt-5 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/suppliers"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-cyan transition-colors hover:text-navy cursor-pointer"
              >
                <Search className="h-4 w-4" aria-hidden />
                {t("findSuppliers")}
              </Link>
              <span aria-hidden className="hidden h-4 w-px bg-slate-200 sm:block" />
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-cyan transition-colors hover:text-navy cursor-pointer"
              >
                <Package className="h-4 w-4" aria-hidden />
                {t("exploreProducts")}
              </Link>
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

          <div className="relative mx-auto hidden w-full max-w-lg sm:block lg:max-w-none">
            <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="relative overflow-hidden rounded-2xl shadow-cardHover ring-1 ring-black/5">
                <Image
                  src="/hero-handshake.png"
                  alt={t("heroImageAlt")}
                  width={1024}
                  height={683}
                  priority
                  className="h-full w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-navy-dark/30 via-transparent to-transparent"
                />
              </div>

              <div className="absolute -left-3 top-6 w-60 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-cardHover backdrop-blur lg:-left-6">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                    <ImageWithFallback
                      src="/banners/metalworks.jpg"
                      fallbackSrc={getSupplierFallbackImage("Metal", t("previewSupplierName"))}
                      alt={t("previewSupplierAlt")}
                      loading="eager"
                      sizes="44px"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-ink">
                      {t("previewSupplierName")}
                    </p>
                    <p className="flex items-center gap-1 text-caption text-ink-muted">
                      <Star className="h-3 w-3 fill-mustard-light text-mustard-light" aria-hidden />
                      {t("previewSupplierRating")}
                    </p>
                  </div>
                  <span className="ml-auto inline-flex items-center rounded-full bg-up-bg p-1 text-up" aria-label={t("verifiedSupplier")}>
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-2 w-60 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-cardHover backdrop-blur lg:-right-5">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                    <ImageWithFallback
                      src="/products/steelbeam.jpg"
                      fallbackSrc={getProductFallbackImage(t("previewProductName"), "Steel & Metals")}
                      alt={t("previewProductAlt")}
                      loading="eager"
                      sizes="44px"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-ink">
                      {t("previewProductName")}
                    </p>
                    <p className="text-caption font-semibold tabular-nums text-ink-muted">
                      {t("previewProductPrice")}
                    </p>
                  </div>
                  <span className="ml-auto inline-flex items-center rounded-full bg-up-bg p-1 text-up" aria-label={t("priceTrendingDown")}>
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-4 left-6 hidden items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-cardHover backdrop-blur lg:flex">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={1.9} aria-hidden />
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
    </section>
  );
}
