import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowDown,
  Globe2,
  MapPin,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import CareersApplicationForm from "@/components/careers/CareersApplicationForm";
import { CAREER_ROLE_KEYS } from "@/lib/careers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("careersTitle"),
    description: t("careersDescription"),
  };
}

const OPEN_ROLES = CAREER_ROLE_KEYS.filter((key) => key !== "general");

const VALUES = [
  { key: "impact", icon: Rocket },
  { key: "ai", icon: Sparkles },
  { key: "global", icon: Globe2 },
  { key: "team", icon: Users },
] as const;

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("careers");
  const contact = await getTranslations("contact");

  return (
    <div className="bg-base">
      <section className="relative overflow-hidden border-b border-slate-100/80 bg-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-40%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-cyan/10 blur-[140px]" />
        </div>
        <div className="container-page relative section-y-tight">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow text-cyan">{t("eyebrow")}</p>
            <h1 className="mt-4 font-display text-display-lg text-ink text-balance sm:text-display-xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-body-lg text-ink-muted">{t("intro")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#open-roles" className="btn-primary px-6 py-3">
                {t("viewRoles")}
              </a>
              <a href="#apply" className="btn-secondary px-6 py-3">
                {t("applyNow")}
                <ArrowDown className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page section-y-tight" aria-labelledby="careers-values">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="careers-values" className="font-display text-display text-ink text-balance">
            {t("valuesTitle")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("valuesSubtitle")}</p>
        </div>
        <div className="mt-block-lg grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ key, icon: Icon }) => (
            <article key={key} className="panel-glass panel-glass-hover p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/5 text-cyan">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-heading-sm text-ink">{t(`values.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`values.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="open-roles"
        className="border-y border-slate-100/80 bg-white scroll-mt-24"
        aria-labelledby="careers-roles"
      >
        <div className="container-page section-y-tight">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-cyan">{t("rolesEyebrow")}</p>
              <h2 id="careers-roles" className="mt-3 font-display text-display text-ink">
                {t("rolesTitle")}
              </h2>
            </div>
            <p className="max-w-md text-sm text-ink-muted">{t("rolesSubtitle")}</p>
          </div>

          <ul className="mt-block divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            {OPEN_ROLES.map((key) => (
              <li key={key} className="grid gap-4 p-6 transition hover:bg-slate-50/70 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <h3 className="font-display text-heading-sm text-ink">{t(`roles.${key}.title`)}</h3>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{t(`roles.${key}.summary`)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-dim">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {t(`roles.${key}.location`)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                      {t(`roles.${key}.type`)}
                    </span>
                  </div>
                </div>
                <a
                  href={`#apply`}
                  className="btn-secondary justify-self-start px-4 py-2 text-sm sm:justify-self-end"
                >
                  {t("apply")}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-muted">{t("noFit")}</p>
        </div>
      </section>

      <section id="apply" className="container-page section-y-tight scroll-mt-24" aria-labelledby="careers-apply">
        <div className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow text-cyan">{t("applyEyebrow")}</p>
            <h2 id="careers-apply" className="mt-3 font-display text-display text-ink text-balance">
              {t("applyTitle")}
            </h2>
            <p className="mt-4 text-body text-ink-muted">{t("applyBody")}</p>
            <ul className="mt-6 space-y-3 text-sm text-ink-muted">
              {(t.raw("applySteps") as string[]).map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-xs font-bold text-cyan">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-ink-dim">
              {t("orEmail")}{" "}
              <a href={`mailto:${contact("email")}`} className="font-semibold text-cyan hover:text-teal">
                {contact("email")}
              </a>
            </p>
          </div>
          <div className="panel-glass p-6 sm:p-8">
            <CareersApplicationForm fallbackEmail={contact("email")} />
          </div>
        </div>
      </section>
    </div>
  );
}
