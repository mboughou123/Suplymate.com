import type { Metadata } from "next";
import { Camera, FileText, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EarlyAccessForm from "@/components/early-access/EarlyAccessForm";
import { type Locale } from "@/i18n/routing";
import { buildPageAlternates } from "@/lib/locale-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("earlyAccessTitle"),
    description: t("earlyAccessDescription"),
    alternates: buildPageAlternates(locale as Locale, "/early-access"),
  };
}

const VALUES = [
  { key: "verified", icon: ShieldCheck },
  { key: "photos", icon: Camera },
  { key: "quotes", icon: FileText },
] as const;

export default async function EarlyAccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("earlyAccess");

  return (
    <div className="bg-base">
      <div className="container-page py-12 sm:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div>
            <p className="eyebrow text-cyan">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-display text-ink text-balance">{t("title")}</h1>
            <p className="mt-4 max-w-xl text-body-lg text-ink-muted">{t("intro")}</p>
            <ul className="mt-8 space-y-5">
              {VALUES.map(({ key, icon: Icon }) => (
                <li key={key} className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-white text-cyan">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-display text-heading-sm text-ink">{t(`values.${key}.title`)}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(`values.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
            <h2 className="font-display text-heading text-ink">{t("formTitle")}</h2>
            <p className="mt-2 text-sm text-ink-muted">{t("formBody")}</p>
            <div className="mt-6">
              <EarlyAccessForm locale={locale} variant="page" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
