"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BadgeCheck,
  Binoculars,
  Columns3,
  LineChart,
  Play,
  RotateCcw,
  Sparkles,
  TrendingDown,
  User,
} from "lucide-react";
import {
  AI_DEMO_OFFERS,
  AI_DEMO_SUPPLIERS,
  AI_DEMO_WEEKLY_CHANGE,
  getDemoSupplier,
} from "@/lib/ai-demo-walkthrough";

type AgentId = "scout" | "compare" | "watch";
type DemoStep = 0 | 1 | 2 | 3 | 4;

const AGENTS: { id: AgentId; icon: typeof Binoculars; step: DemoStep }[] = [
  { id: "scout", icon: Binoculars, step: 2 },
  { id: "compare", icon: Columns3, step: 3 },
  { id: "watch", icon: LineChart, step: 4 },
];

const STEP_DELAY_MS = 900;

export default function HomeAiDemoSection() {
  const t = useTranslations("homeAiDemo");
  const [step, setStep] = useState<DemoStep>(0);
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const maxReachedStep = step;

  const runWalkthrough = useCallback(() => {
    clearTimers();
    setPlaying(true);
    setStep(1);
    setActiveAgent(null);

    const advance = (next: DemoStep, agent: AgentId | null, delay: number) => {
      const id = setTimeout(() => {
        setStep(next);
        setActiveAgent(agent);
        if (next === 4) setPlaying(false);
      }, delay);
      timers.current.push(id);
    };

    if (reducedMotion) {
      setStep(4);
      setActiveAgent("watch");
      setPlaying(false);
      return;
    }

    advance(2, "scout", STEP_DELAY_MS);
    advance(3, "compare", STEP_DELAY_MS * 2);
    advance(4, "watch", STEP_DELAY_MS * 3);
  }, [clearTimers, reducedMotion]);

  const reset = () => {
    clearTimers();
    setStep(0);
    setActiveAgent(null);
    setPlaying(false);
  };

  const jumpToAgent = (agent: AgentId, targetStep: DemoStep) => {
    if (maxReachedStep < targetStep && !playing) return;
    clearTimers();
    setPlaying(false);
    setStep(Math.max(step, targetStep) as DemoStep);
    setActiveAgent(agent);
  };

  const showQuery = step >= 1;
  const showScout = step >= 2;
  const showCompare = step >= 3;
  const showWatch = step >= 4;

  const watchChangeLabel =
    AI_DEMO_WEEKLY_CHANGE < 0
      ? AI_DEMO_WEEKLY_CHANGE.toFixed(1)
      : `+${AI_DEMO_WEEKLY_CHANGE.toFixed(1)}`;

  return (
    <section
      id="ai-demo-walkthrough"
      className="relative border-b border-slate-100/80 bg-gradient-to-b from-white via-base/40 to-white section-y-tight"
      aria-labelledby="ai-demo-heading"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-cyan/5 blur-3xl" />
      </div>

      <div className="relative container-page">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/25 bg-white/80 px-3 py-1 eyebrow text-cyan shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("eyebrow")}
          </span>
          <h2
            id="ai-demo-heading"
            className="mt-5 font-display text-display text-ink text-balance"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <div className="mx-auto mt-block-lg max-w-4xl">
          <div className="panel-glass overflow-hidden shadow-glow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100/90 bg-white/60 px-4 py-3.5 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {AGENTS.map(({ id, icon: Icon, step: agentStep }) => {
                  const isActive = activeAgent === id;
                  const unlocked = maxReachedStep >= agentStep || playing;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={step === 0}
                      onClick={() => jumpToAgent(id, agentStep)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-navy-gradient text-white shadow-glow-subtle"
                          : unlocked
                            ? "border border-slate-200/90 bg-white/90 text-ink hover:border-cyan/35 hover:text-cyan"
                            : "border border-slate-100 bg-white/50 text-ink-dim cursor-not-allowed"
                      }`}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {t(`agent${id.charAt(0).toUpperCase()}${id.slice(1)}`)}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-slate-100/80 hover:text-ink"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    {t("reset")}
                  </button>
                )}
                <button
                  id="ai-demo-run"
                  type="button"
                  onClick={runWalkthrough}
                  disabled={playing}
                  className="btn-accent inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  {step === 0 ? t("runWalkthrough") : t("replayWalkthrough")}
                </button>
              </div>
            </div>

            <div className="stack-block p-4 sm:p-6" aria-live="polite">
              <p className="rounded-xl border border-amber-200/70 bg-amber-50/90 px-4 py-2.5 text-center text-xs font-medium leading-relaxed text-amber-950">
                {t("walkthroughDisclaimer")}
              </p>

              {showQuery && (
                <div className="flex justify-end motion-safe:animate-fade-up">
                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-navy-gradient px-4 py-3.5 text-sm text-white shadow-glow-subtle sm:max-w-md">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                      <User className="h-3 w-3" aria-hidden />
                      {t("youLabel")}
                    </div>
                    <p>{t("userQuery")}</p>
                  </div>
                </div>
              )}

              {showScout && (
                <div
                  className="rounded-xl border border-slate-100/90 bg-white/50 p-4 motion-safe:animate-fade-up sm:p-5"
                  role="region"
                  aria-label={t("agentScout")}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
                      <Binoculars className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{t("agentScout")}</p>
                      <p className="text-xs text-ink-muted">{t("scoutIntro")}</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {AI_DEMO_SUPPLIERS.map((supplier) => (
                      <li key={supplier.id}>
                        <Link
                          href={`/supplier/${supplier.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 text-sm shadow-sm transition hover:border-cyan/30 hover:shadow-glow-panel"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">
                              {supplier.name}
                            </span>
                            <span className="text-xs text-ink-muted">{supplier.country}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <BadgeCheck className="h-3 w-3" aria-hidden />
                            {t("verified")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-ink-dim">{t("scoutFootnote")}</p>
                </div>
              )}

              {showCompare && (
                <div
                  className="rounded-xl border border-slate-100/90 bg-white/50 p-4 motion-safe:animate-fade-up sm:p-5"
                  role="region"
                  aria-label={t("agentCompare")}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
                      <Columns3 className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{t("agentCompare")}</p>
                      <p className="text-xs text-ink-muted">{t("compareIntro")}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {AI_DEMO_OFFERS.map((offer) => {
                      const supplier = getDemoSupplier(offer.supplierId);
                      if (!supplier) return null;
                      return (
                        <div
                          key={offer.supplierId}
                          className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm"
                        >
                          <p className="truncate text-xs font-semibold text-ink">
                            {supplier.name}
                          </p>
                          <p className="text-[10px] text-ink-dim">{supplier.country}</p>
                          <dl className="mt-3 space-y-2 text-xs">
                            <div className="flex justify-between gap-2">
                              <dt className="text-ink-muted">{t("comparePrice")}</dt>
                              <dd className="font-bold tabular-nums text-cyan">
                                ${offer.pricePerMeter.toFixed(2)}/m
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-ink-muted">{t("compareMoq")}</dt>
                              <dd className="font-semibold tabular-nums text-ink">{offer.moq}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-ink-muted">{t("compareLead")}</dt>
                              <dd className="font-semibold tabular-nums text-ink">
                                {t("leadDays", { days: offer.leadDays })}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-ink-dim">{t("compareFootnote")}</p>
                </div>
              )}

              {showWatch && (
                <div
                  className="rounded-xl border border-slate-100/90 bg-white/50 p-4 motion-safe:animate-fade-up sm:p-5"
                  role="region"
                  aria-label={t("agentWatch")}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
                      <LineChart className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{t("agentWatch")}</p>
                      <p className="text-xs text-ink-muted">{t("watchIntro")}</p>
                    </div>
                  </div>
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3">
                    <TrendingDown className="h-4 w-4 text-emerald-700" aria-hidden />
                    <span className="text-sm font-semibold text-emerald-900">
                      {t("watchSignal", { change: watchChangeLabel })}
                    </span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                      {t("waitWindow")}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t("watchDetail")}</p>
                  <p className="mt-2 text-[11px] text-ink-dim">{t("watchFootnote")}</p>
                </div>
              )}

              {step === 0 && (
                <p className="py-8 text-center text-sm text-ink-muted">{t("idleHint")}</p>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-ink-dim">{t("ctaHint")}</p>
          <div className="mt-4 flex justify-center">
            <Link href="/ai-assistant" className="btn-secondary px-5 py-2.5 text-sm">
              {t("openAssistant")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
