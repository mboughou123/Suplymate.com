import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Bot,
  Headset,
  ShieldCheck,
  LineChart,
  Lightbulb,
  BellRing,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { getSiteStats } from "@/lib/site-stats";

type Capability = {
  icon: LucideIcon;
  titleKey:
    | "capabilityAiMatching"
    | "capabilityHumanExperts"
    | "capabilityVerifiedNetwork"
    | "capabilityPriceTracking"
    | "capabilitySourcingIntelligence"
    | "capabilityPriceAlerts";
  textKey:
    | "capabilityAiMatchingText"
    | "capabilityHumanExpertsText"
    | "capabilityVerifiedNetworkText"
    | "capabilityPriceTrackingText"
    | "capabilitySourcingIntelligenceText"
    | "capabilityPriceAlertsText";
};

const capabilities: Capability[] = [
  { icon: Bot, titleKey: "capabilityAiMatching", textKey: "capabilityAiMatchingText" },
  { icon: Headset, titleKey: "capabilityHumanExperts", textKey: "capabilityHumanExpertsText" },
  { icon: ShieldCheck, titleKey: "capabilityVerifiedNetwork", textKey: "capabilityVerifiedNetworkText" },
  { icon: LineChart, titleKey: "capabilityPriceTracking", textKey: "capabilityPriceTrackingText" },
  { icon: Lightbulb, titleKey: "capabilitySourcingIntelligence", textKey: "capabilitySourcingIntelligenceText" },
  { icon: BellRing, titleKey: "capabilityPriceAlerts", textKey: "capabilityPriceAlertsText" },
];

export default async function TrustAiSection() {
  const t = await getTranslations("aiAssistant");
  const siteStats = await getSiteStats();

  const stats = [
    { value: siteStats.supplierCount, label: t("statListedSuppliers") },
    { value: siteStats.countryCount, label: t("statCountries") },
    { value: siteStats.categoryCount, label: t("statCategories") },
  ];

  return (
    <section className="relative overflow-hidden bg-navy-dark py-20 text-white sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(56rem_30rem_at_50%_-8rem,rgba(56,189,248,0.16),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_24rem_at_85%_110%,rgba(20,184,166,0.10),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "linear-gradient(to bottom, black, transparent 80%)",
          }}
        />
      </div>

      <div className="relative container-page">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-glow/25 bg-cyan-glow/10 px-3.5 py-1.5 eyebrow text-cyan-glow">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("badge")}
          </span>
          <h2 className="mt-5 font-display text-display text-white">
            {t("subtitle")}
          </h2>
          <p className="mt-4 text-body-lg text-white/70">
            {t("description")}
          </p>
        </AnimatedSection>

        <div className="mt-14 grid divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm sm:grid-cols-3 sm:divide-x">
          {stats.map((stat, i) => (
            <AnimatedSection
              key={stat.label}
              delay={i * 0.06}
              from="up"
              className="px-6 py-7 text-center"
            >
              <p className="font-display text-heading-lg font-bold tabular-nums text-white sm:text-display">
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-1 text-body-sm text-white/60">{stat.label}</p>
            </AnimatedSection>
          ))}
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <AnimatedSection key={cap.titleKey} delay={(i % 3) * 0.06} from="up">
              <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-300 ease-cinema hover:-translate-y-1 hover:border-cyan-glow/30 hover:bg-white/[0.07] motion-reduce:transform-none">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-glow/20 bg-cyan-glow/10 text-cyan-glow">
                  <cap.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <h3 className="mt-5 text-heading-sm text-white">{t(cap.titleKey)}</h3>
                <p className="mt-2 text-body-sm text-white/65">{t(cap.textKey)}</p>
              </article>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="mt-12 flex flex-wrap justify-center gap-4" delay={0.1}>
          <Link
            href="/ai-assistant"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-navy shadow-cardHover transition-all duration-200 ease-cinema hover:bg-cyan-soft active:translate-y-px cursor-pointer"
          >
            <Bot className="h-4 w-4" aria-hidden />
            {t("tryAssistant")}
          </Link>
          <Link
            href="/suppliers"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 ease-cinema hover:border-white/35 hover:bg-white/10 active:translate-y-px cursor-pointer"
          >
            {t("browseSuppliers")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
