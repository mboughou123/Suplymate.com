"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check, Factory, TrendingUp, Atom } from "lucide-react";
import AiOrb from "@/components/fx/AiOrb";
import Beam from "@/components/fx/Beam";
import MetalButton from "@/components/fx/MetalButton";
import { INDUSTRIES } from "@/data/industries";
import { MATERIAL_CATALOG } from "@/data/material-catalog";

const STEP_INTERVAL = 1400;

export default function HomeHero({ supplierCount }: { supplierCount: number }) {
  const t = useTranslations("hero");
  const [step, setStep] = useState(0);

  // Cycle the console demo: prompt → parse → scan → score → result.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(4);
      return;
    }
    const id = window.setInterval(() => setStep((s) => (s + 1) % 5), STEP_INTERVAL);
    return () => window.clearInterval(id);
  }, []);

  const steps = [t("consoleStep1"), t("consoleStep2"), t("consoleStep3")];
  const orbState = step === 0 ? "listening" : step === 1 ? "shaping" : step === 2 ? "searching" : step === 3 ? "solving" : "breathing";

  return (
    <section className="relative overflow-hidden bg-[#050B12] pb-20 pt-32 text-white sm:pt-40 lg:pb-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-25%] h-[70vh] w-[90vw] -translate-x-1/2 rounded-full bg-cyan/20 blur-[150px] motion-safe:animate-aurora-drift" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-[#0EA5E9]/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at 50% 20%, black 25%, transparent 70%)",
          }}
        />
      </div>

      <div className="container-page relative grid items-center gap-14 lg:grid-cols-[6fr_5fr]">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-glow animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-glow" />
            {t("badge")}
          </p>
          <h1
            className="mt-6 font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.03em] text-balance animate-fade-up sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            <span className="block text-white">{t("title1")}</span>
            <span className="block bg-gradient-to-r from-cyan-glow via-[#7DD3FC] to-white bg-clip-text text-transparent">
              {t("title2")}
            </span>
          </h1>
          <p
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/65 animate-fade-up lg:mx-0"
            style={{ animationDelay: "120ms" }}
          >
            {t("subtitle")}
          </p>

          <div
            className="mt-10 flex flex-col items-center justify-center gap-3 animate-fade-up sm:flex-row lg:justify-start"
            style={{ animationDelay: "180ms" }}
          >
            <MetalButton preset="chromatic" strength={0.95}>
              <Link
                href="/ai-assistant"
                className="inline-flex min-w-[12rem] items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-navy-deep transition hover:bg-cyan-glow"
              >
                {t("ctaStart")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </MetalButton>
            <Link
              href="/suppliers"
              className="inline-flex min-w-[12rem] items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("ctaExplore")}
            </Link>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-8 text-left animate-fade-up" style={{ animationDelay: "240ms" }}>
            <Stat icon={Factory} value={supplierCount.toLocaleString()} label={t("statSuppliers")} />
            <Stat icon={TrendingUp} value={String(INDUSTRIES.length)} label={t("statIndustries")} />
            <Stat icon={Atom} value={String(MATERIAL_CATALOG.length)} label={t("statMaterials")} />
          </dl>
        </div>

        {/* Agent console */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none animate-fade-up" style={{ animationDelay: "200ms" }}>
          <Beam size="md" colorVariant="ocean" strength={0.6}>
            <div className="rounded-2xl border border-white/10 bg-[#0A1622]/90 p-5 shadow-[0_40px_120px_-30px_rgba(3,105,161,0.6)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <AiOrb state={orbState} size={20} theme="dark" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{t("consoleLabel")}</p>
                  <p className="text-[11px] text-white/50">suplymate.com/ai-assistant</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85">
                {t("consolePrompt")}
              </div>

              <ol className="mt-4 space-y-2">
                {steps.map((label, i) => {
                  const done = step > i + 1 || step === 4;
                  const active = step === i + 1;
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-2.5 text-xs transition-colors duration-300 ${
                        done ? "text-white/80" : active ? "text-cyan-glow" : "text-white/35"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          done ? "border-cyan-glow/50 bg-cyan/20" : active ? "border-cyan-glow" : "border-white/15"
                        }`}
                      >
                        {done ? <Check className="h-3 w-3 text-cyan-glow" aria-hidden /> : <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan-glow animate-glow-pulse" : "bg-white/25"}`} />}
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ol>

              <div
                className={`mt-4 rounded-xl border p-3 transition-all duration-500 ${
                  step === 4 ? "border-cyan-glow/40 bg-cyan/10 opacity-100" : "border-white/10 bg-white/[0.02] opacity-60"
                }`}
              >
                <p className="text-xs font-semibold text-white">{t("consoleResult")}</p>
                <div className="mt-2 space-y-1.5">
                  {[
                    { label: "Price", v: 78 },
                    { label: "Delivery", v: 84 },
                    { label: "Quality", v: 91 },
                    { label: "Location", v: 98 },
                    { label: "Trust", v: 94 },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-[4rem_1fr_2rem] items-center gap-2 text-[11px]">
                      <span className="text-white/55">{row.label}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-cyan to-cyan-glow transition-[width] duration-700 ease-cinema"
                          style={{ width: step === 4 ? `${row.v}%` : "0%" }}
                        />
                      </span>
                      <span className="text-right tabular-nums text-white/80">{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-white/40">{t("trustNote")}</p>
            </div>
          </Beam>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Factory; value: string; label: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/45">
        <Icon className="h-3.5 w-3.5 text-cyan-glow" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{value}</dd>
    </div>
  );
}
