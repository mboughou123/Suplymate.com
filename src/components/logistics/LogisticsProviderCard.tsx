"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ExternalLink, Globe2, MapPin } from "lucide-react";
import { logisticsProviderHref, type LogisticsProvider } from "@/data/logistics-providers";
import SupplierCardContact from "@/components/supplier-contact/SupplierCardContact";
import ProviderBadge from "./ProviderBadge";

export default function LogisticsProviderCard({ provider, logoUrl }: { provider: LogisticsProvider; logoUrl?: string | null }) {
  const t = useTranslations("logistics");
  const hq = provider.headquarters;

  return (
    <article className="glass-card glass-hover flex flex-col gap-4 p-5" data-testid="logistics-provider-card">
      <div className="flex items-start gap-3">
        <ProviderBadge provider={provider} logoUrl={logoUrl} />
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-tight text-ink">
            <Link href={logisticsProviderHref(provider.id)} className="hover:text-cyan">
              {provider.name}
            </Link>
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-md bg-cyan/10 px-2 py-0.5 font-semibold text-cyan">{t(`kind.${provider.kind}`)}</span>
            {hq && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-muted">
                <MapPin className="h-3 w-3" aria-hidden />
                {hq.city}, {hq.country}
              </span>
            )}
            {provider.regions[0] && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-muted">
                <Globe2 className="h-3 w-3" aria-hidden />
                {provider.regions[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="line-clamp-3 text-sm text-ink-muted">{provider.description}</p>

      <ul className="flex flex-wrap gap-1.5" aria-label={t("coverage")}>
        {provider.coverage.slice(0, 4).map((c) => (
          <li key={c} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
            {c}
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-2">
        <SupplierCardContact supplierId={provider.id} supplierName={provider.name} />
        <div className="flex gap-2">
          <Link
            href={logisticsProviderHref(provider.id)}
            className="btn-secondary flex-1 justify-center !py-2 text-xs"
          >
            {t("viewProfile")}
          </Link>
          {provider.quoteUrl && (
            <a
              href={provider.quoteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={t("requestQuoteAria", { name: provider.name })}
              className="btn-primary flex-1 justify-center !py-2 text-xs"
            >
              {t("requestQuote")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
