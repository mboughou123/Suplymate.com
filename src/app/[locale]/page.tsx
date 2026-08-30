import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Search,
  GitCompare,
  CheckCircle2,
} from "lucide-react";
import Hero from "@/components/Hero";
import HomeAiDemoSection from "@/components/HomeAiDemoSection";
import HomeCloseSection from "@/components/HomeCloseSection";
import FeatureCard, { type FeatureIconName } from "@/components/FeatureCard";
import SocialProof from "@/components/SocialProof";
import HomepageSupplierSection from "@/components/HomepageSupplierSection";
import HomepageProductSection from "@/components/HomepageProductSection";
import TrustAiSection from "@/components/TrustAiSection";
import Reveal from "@/components/Reveal";

type Feature = {
  titleKey: FeatureIconName;
  descriptionKey:
    | "findSuppliersDescription"
    | "compareProductsDescription"
    | "trackMaterialPricesDescription"
    | "askAiAssistantDescription";
  // Serializable icon key resolved inside the client FeatureCard — never pass
  // a Lucide component across the server→client boundary.
  icon: FeatureIconName;
  href: string;
};

const features: Feature[] = [
  {
    titleKey: "findSuppliers",
    descriptionKey: "findSuppliersDescription",
    icon: "findSuppliers",
    href: "/suppliers",
  },
  {
    titleKey: "compareProducts",
    descriptionKey: "compareProductsDescription",
    icon: "compareProducts",
    href: "/products",
  },
  {
    titleKey: "trackMaterialPrices",
    descriptionKey: "trackMaterialPricesDescription",
    icon: "trackMaterialPrices",
    href: "/price-charts",
  },
  {
    titleKey: "askAiAssistant",
    descriptionKey: "askAiAssistantDescription",
    icon: "askAiAssistant",
    href: "/ai-assistant",
  },
];

const industryKeys = [
  "industryMetalSteel",
  "industryConstruction",
  "industryIndustrialEquipment",
  "industryElectrotechnical",
  "industryPlasticsPackaging",
  "industryAgriculture",
  "industryChemicals",
  "industryEnergy",
] as const;

const steps = [
  {
    step: "01",
    icon: Search,
    titleKey: "stepSearch" as const,
    textKey: "stepSearchText" as const,
  },
  {
    step: "02",
    icon: GitCompare,
    titleKey: "stepCompare" as const,
    textKey: "stepCompareText" as const,
  },
  {
    step: "03",
    icon: CheckCircle2,
    titleKey: "stepDecide" as const,
    textKey: "stepDecideText" as const,
  },
];

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <>
      <Hero />

      <HomeAiDemoSection />

      <section className="container-page py-20 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display text-ink">
            {t("featuresTitle")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">
            {t("featuresSubtitle")}
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.titleKey} delay={i * 100}>
              <FeatureCard
                title={t(f.titleKey)}
                description={t(f.descriptionKey)}
                icon={f.icon}
                href={f.href}
              />
            </Reveal>
          ))}
        </div>
      </section>

      <HomepageSupplierSection />

      <HomepageProductSection />

      <TrustAiSection />

      <SocialProof />

      <section className="py-20 sm:py-24">
        <div className="container-page">
          <Reveal>
            <h2 className="text-center font-display text-display text-ink">
              {t("industriesTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-body-lg text-ink-muted">
              {t("industriesSubtitle")}
            </p>
          </Reveal>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {industryKeys.map((key, i) => (
              <Reveal key={key} delay={i * 40}>
                <Link
                  href="/suppliers"
                  className="inline-block rounded-full border border-slate-200 bg-white px-5 py-2.5 text-body-sm font-medium text-ink-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-cinema hover:border-cyan/40 hover:bg-cyan-soft hover:text-cyan cursor-pointer"
                >
                  {t(key)}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20 sm:py-24">
        <Reveal>
          <h2 className="text-center font-display text-display text-ink">
            {t("howItWorksTitle")}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal as="div" key={s.step} delay={i * 100} className="glass-card glass-hover relative p-8">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-soft text-cyan ring-1 ring-inset ring-cyan/15">
                  <s.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span
                  aria-hidden
                  className="font-display text-display font-bold tabular-nums text-slate-200"
                >
                  {s.step}
                </span>
              </div>
              <h3 className="mt-6 text-heading-sm text-ink">{t(s.titleKey)}</h3>
              <p className="mt-2 text-body-sm text-ink-muted">{t(s.textKey)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <HomeCloseSection
        title={t("ctaTitle")}
        subtitle={t("ctaSubtitle")}
        tryLabel={t("tryWalkthrough")}
        plansLabel={t("seePlans")}
      />
    </>
  );
}
