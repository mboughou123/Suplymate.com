import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Factory, TrendingUp, Atom, Sparkles, MessageSquare, ArrowRight, X } from "lucide-react";
import AiOrb from "@/components/fx/AiOrb";
import MetalButton from "@/components/fx/MetalButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const footer = await getTranslations("footer");
  const problemList = t.raw("problemList") as string[];

  const pillars = [
    { icon: Factory, title: t("pillarDiscovery"), text: t("pillarDiscoveryText") },
    { icon: TrendingUp, title: t("pillarPrice"), text: t("pillarPriceText") },
    { icon: Atom, title: t("pillarMaterial"), text: t("pillarMaterialText") },
    { icon: Sparkles, title: t("pillarAi"), text: t("pillarAiText") },
    { icon: MessageSquare, title: t("pillarChat"), text: t("pillarChatText") },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#050B12] py-24 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-30%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-cyan/20 blur-[140px]" />
        </div>
        <div className="container-page relative grid items-center gap-12 lg:grid-cols-[3fr_2fr]">
          <div>
            <p className="eyebrow text-cyan-glow">{t("eyebrow")}</p>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">{t("intro")}</p>
          </div>
          <div className="hidden justify-center lg:flex">
            <div className="flex h-56 w-56 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_0_100px_rgba(56,189,248,0.25)] backdrop-blur">
              <AiOrb state="connecting" size={64} theme="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="container-page section-y-tight">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-cyan">{t("problemEyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink text-balance">{t("problemTitle")}</h2>
            <p className="mt-5 leading-relaxed text-ink-muted">{t("problemText")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {problemList.map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-ink-muted"
                style={{ transform: `rotate(${((i % 3) - 1) * 1.2}deg)` }}
              >
                <X className="h-3.5 w-3.5 text-red-400" aria-hidden />
                {item}
              </div>
            ))}
            <div className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-navy px-3 py-3 text-sm font-semibold text-white sm:col-span-3">
              <ArrowRight className="h-4 w-4 text-cyan-glow" aria-hidden />
              Suplymate
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-[#F5F7FA]">
        <div className="container-page section-y-tight">
          <p className="eyebrow text-cyan">{t("solutionEyebrow")}</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-ink text-balance">{t("solutionTitle")}</h2>
          <p className="mt-5 max-w-3xl leading-relaxed text-ink-muted">{t("solutionText")}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-soft text-cyan">
                  <p.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{p.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="container-page section-y-tight">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-cyan">{t("visionEyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink text-balance">{t("visionTitle")}</h2>
            <p className="mt-5 leading-relaxed text-ink-muted">{t("visionText")}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-navy p-8 text-white shadow-card">
            <h3 className="font-display text-xl font-bold">{t("notAlibaba")}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{t("notAlibabaText")}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-[#050B12] px-6 py-14 text-center text-white sm:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-[-60%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-cyan/20 blur-[120px]" />
          </div>
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight">{t("ctaTitle")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/65">{t("ctaBody")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MetalButton preset="chromatic" strength={0.9}>
                <Link href="/ai-assistant" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy-deep">
                  {t("ctaPrimary")} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </MetalButton>
              <Link href="/suppliers" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                {t("ctaSecondary")}
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/45">
              {t("contactTitle")}:{" "}
              <Link href="/contact" className="text-cyan-glow hover:underline">
                {footer("contact")}
              </Link>{" "}
              · info@suplymate.com
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
