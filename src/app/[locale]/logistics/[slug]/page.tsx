import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronRight, ExternalLink, Globe2, Info, MapPin, ShieldCheck } from "lucide-react";
import { buildPageAlternates } from "@/lib/locale-metadata";
import {
  LOGISTICS_PROVIDERS,
  PROVIDERS_CHECKED_AT,
  getLogisticsProvider,
  logisticsDirectoryHref,
} from "@/data/logistics-providers";
import SupplierContactDetails from "@/components/supplier-contact/SupplierContactDetails";
import ProviderBadge from "@/components/logistics/ProviderBadge";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOGISTICS_PROVIDERS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "logistics" });
  const provider = getLogisticsProvider(slug);
  if (!provider) return { title: t("notFound") };
  const title = t("metaTitle", { name: provider.name });
  const description = t("metaDescription", { name: provider.name, description: provider.description });
  const alternates = buildPageAlternates(locale as Locale, `/logistics/${slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, siteName: "Suplymate", type: "website" },
  };
}

export default async function LogisticsProviderPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("logistics");
  const provider = getLogisticsProvider(slug);
  if (!provider) notFound();

  const hq = provider.headquarters;
  const checkedOn = new Date(`${PROVIDERS_CHECKED_AT}T00:00:00Z`).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="bg-base/40 min-h-screen pb-16">
      <nav className="container-page flex items-center gap-1.5 pt-4 text-xs text-ink-dim" aria-label={t("breadcrumb")}>
        <Link href={logisticsDirectoryHref()} className="hover:text-cyan">
          {t("breadcrumb")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-ink-muted">{provider.name}</span>
      </nav>

      <div className="mx-auto mt-4 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="min-w-0 space-y-6">
          <header className="glass-card p-6">
            <div className="flex items-start gap-4">
              <ProviderBadge provider={provider} size="lg" />
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold leading-tight text-ink">{provider.name}</h1>
                <p className="mt-1 text-sm text-ink-muted">{provider.company}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-md bg-cyan/10 px-2 py-0.5 font-semibold text-cyan">
                    {t(`kind.${provider.kind}`)}
                  </span>
                  {hq && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-muted">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {hq.city}, {hq.country}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-ink">{provider.description}</p>
          </header>

          <section className="glass-card p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold text-ink">
              <ShieldCheck className="h-5 w-5 text-cyan" aria-hidden />
              {t("coverage")}
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {provider.coverage.map((c) => (
                <li key={c} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink">
                  {c}
                </li>
              ))}
            </ul>

            <h2 className="mt-6 inline-flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Globe2 className="h-5 w-5 text-cyan" aria-hidden />
              {t("regions")}
            </h2>
            {provider.regions.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {provider.regions.map((r) => (
                  <li key={r} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink-muted">
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-dim">{t("regionsUnstated")}</p>
            )}
          </section>

          <section className="glass-card p-6">
            <h2 className="font-display text-lg font-bold text-ink">{t("sources")}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t("sourcesBody", { company: provider.company, date: checkedOn })}
            </p>
            <ul className="mt-3 space-y-1">
              {provider.sourceUrls.map((url) => (
                <li key={url} className="truncate text-xs">
                  <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-cyan hover:underline">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="glass-card space-y-3 p-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-dim">{t("links")}</h2>
            {provider.quoteUrl && (
              <a
                href={provider.quoteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={t("requestQuoteAria", { name: provider.name })}
                className="btn-primary w-full justify-center text-sm"
              >
                {t("requestQuote")}
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn-secondary w-full justify-center text-sm"
            >
              {t("cargoPage")}
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            {provider.homepage !== provider.website && (
              <a
                href={provider.homepage}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block text-center text-xs font-medium text-cyan hover:underline"
              >
                {t("homepage")}
              </a>
            )}
          </div>

          <div className="glass-card p-5">
            <SupplierContactDetails
              supplierId={provider.id}
              supplierName={provider.name}
              profilePath={`/logistics/${provider.id}`}
              fallback={<p className="text-xs text-ink-muted">{t("noContactOnFile")}</p>}
            />
          </div>

          <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-snug text-ink-dim">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("disclaimer")}
          </p>
        </aside>
      </div>
    </div>
  );
}
