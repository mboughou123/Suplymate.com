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
      className="relative section-y-tight scroll-mt-28"
      aria-labelledby="ai-demo-heading"
    >
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2 id="ai-demo-heading" className="mt-3 font-display text-display text-ink text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <div className="mx-auto mt-block-lg max-w-4xl">
          <div className="agent-console glow-azure-subtle">
            <div aria-hidden className="agent-console-scan motion-reduce:hidden" />

            <div className="relative border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" aria-hidden />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" aria-hidden />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" aria-hidden />
                  <span className="ms-2 text-xs font-medium text-white/50">{t("consoleLabel")}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {AGENTS.map(({ id, icon: Icon, step: agentStep }) => {
                    const isActive = activeAgent === id;
                    const unlocked = maxReachedStep >= agentStep || playing;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={step === 0}
                        onClick={() => jumpToAgent(id, agentStep)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                          isActive
                            ? "bg-cyan/20 text-cyan-glow ring-1 ring-cyan/30"
                            : unlocked
                              ? "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                              : "cursor-not-allowed bg-white/5 text-white/30"
                        }`}
                        aria-pressed={isActive}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
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
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-white/50 hover:bg-white/5 hover:text-white/80"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden />
                      {t("reset")}
                    </button>
                  )}
                  <button
                    id="ai-demo-run"
                    type="button"
                    onClick={runWalkthrough}
                    disabled={playing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#075985] disabled:opacity-60"
                  >
                    <Play className="h-3 w-3" aria-hidden />
                    {step === 0 ? t("runWalkthrough") : t("replayWalkthrough")}
                  </button>
                </div>
              </div>
            </div>

            <div className="relative stack-block p-4 sm:p-6" aria-live="polite">
              <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-center text-[11px] font-medium text-amber-100/90">
                {t("walkthroughDisclaimer")}
              </p>

              {showQuery && (
                <div className="flex justify-end motion-safe:animate-fade-up">
                  <div className="max-w-[92%] rounded-2xl rounded-br-md border border-white/10 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-sm sm:max-w-md">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                      <User className="h-3 w-3" aria-hidden />
                      {t("youLabel")}
                    </div>
                    <p>{t("userQuery")}</p>
                  </div>
                </div>
              )}

              {showScout && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 motion-safe:animate-fade-up" role="region" aria-label={t("agentScout")}>
                  <div className="mb-3 flex items-center gap-2">
                    <Binoculars className="h-4 w-4 text-cyan-glow" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-white">{t("agentScout")}</p>
                      <p className="text-xs text-white/55">{t("scoutIntro")}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {AI_DEMO_SUPPLIERS.map((supplier) => (
                      <li key={supplier.id}>
                        <Link
                          href={`/supplier/${supplier.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm transition hover:border-cyan/30 hover:bg-white/10"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white">{supplier.name}</span>
                            <span className="text-xs text-white/50">{supplier.country}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-bold text-cyan-glow">
                            <BadgeCheck className="h-3 w-3" aria-hidden />
                            {t("verified")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-white/40">{t("scoutFootnote")}</p>
                </div>
              )}

              {showCompare && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 motion-safe:animate-fade-up" role="region" aria-label={t("agentCompare")}>
                  <div className="mb-3 flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-cyan-glow" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-white">{t("agentCompare")}</p>
                      <p className="text-xs text-white/55">{t("compareIntro")}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {AI_DEMO_OFFERS.map((offer) => {
                      const supplier = getDemoSupplier(offer.supplierId);
                      if (!supplier) return null;
                      return (
                        <div key={offer.supplierId} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <p className="truncate text-xs font-semibold text-white">{supplier.name}</p>
                          <p className="text-[10px] text-white/45">{supplier.country}</p>
                          <dl className="mt-3 space-y-2 text-xs">
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/50">{t("comparePrice")}</dt>
                              <dd className="font-bold tabular-nums text-cyan-glow">
                                ${offer.pricePerMeter.toFixed(2)}/m
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/50">{t("compareMoq")}</dt>
                              <dd className="font-semibold tabular-nums text-white/90">{offer.moq}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-white/50">{t("compareLead")}</dt>
                              <dd className="font-semibold tabular-nums text-white/90">
                                {t("leadDays", { days: offer.leadDays })}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-white/40">{t("compareFootnote")}</p>
                </div>
              )}

              {showWatch && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 motion-safe:animate-fade-up" role="region" aria-label={t("agentWatch")}>
                  <div className="mb-3 flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-cyan-glow" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-white">{t("agentWatch")}</p>
                      <p className="text-xs text-white/55">{t("watchIntro")}</p>
                    </div>
                  </div>
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-cyan/25 bg-cyan/10 px-4 py-3">
                    <TrendingDown className="h-4 w-4 text-cyan-glow" aria-hidden />
                    <span className="text-sm font-semibold text-white">
                      {t("watchSignal", { change: watchChangeLabel })}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-glow">
                      {t("waitWindow")}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-white/55">{t("watchDetail")}</p>
                  <p className="mt-2 text-[11px] text-white/40">{t("watchFootnote")}</p>
                </div>
              )}

              {step === 0 && (
                <p className="py-10 text-center text-sm text-white/45">{t("idleHint")}</p>
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
