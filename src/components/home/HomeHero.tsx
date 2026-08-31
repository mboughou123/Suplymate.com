"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomeHero() {
  const t = useTranslations("hero");

  const scrollToDemo = () => {
    document.getElementById("ai-demo-walkthrough")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => document.getElementById("ai-demo-run")?.focus(), 450);
  };

  return (
    <section className="relative overflow-hidden hero-ambient pt-28 sm:pt-32 lg:pt-36">
      <div className="relative container-page pb-section pt-6 text-center sm:pb-section-lg sm:pt-10">
        <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.22em] text-cyan">
          {t("badge")}
        </p>

        <h1
          className="mx-auto mt-5 max-w-5xl animate-fade-up font-display text-display-hero text-balance sm:text-display-xl lg:text-display-2xl"
          style={{ animationDelay: "60ms" }}
        >
          <span className="gradient-text">{t("titleGradient")}</span>
          <br />
          <span className="text-navy">{t("titleRest")}</span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl animate-fade-up text-body-lg text-ink-muted sm:text-xl sm:leading-8"
          style={{ animationDelay: "120ms" }}
        >
          {t("subtitle")}
        </p>

        <div
          className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          style={{ animationDelay: "180ms" }}
        >
          <button type="button" onClick={scrollToDemo} className="btn-accent min-w-[12rem] px-8 py-3.5">
            {t("tryWalkthrough")}
          </button>
          <Link href="/pricing" className="btn-secondary min-w-[12rem] px-8 py-3.5">
            {t("seePlans")}
          </Link>
        </div>
      </div>
    </section>
  );
}
