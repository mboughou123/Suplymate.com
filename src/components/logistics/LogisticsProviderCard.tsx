"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ExternalLink, Globe2, MapPin } from "lucide-react";
import { logisticsProviderHref, providerCoverImage, type LogisticsProvider } from "@/data/logistics-providers";
import SupplierCardContact from "@/components/supplier-contact/SupplierCardContact";
import ImageWithFallback from "@/components/ImageWithFallback";
import ProviderBadge from "./ProviderBadge";

const MAX_CHIPS = 3;

export default function LogisticsProviderCard({
  provider,
  logoUrl,
  photoUrl,
}: {
  provider: LogisticsProvider;
  logoUrl?: string | null;
  /** First published provider photo; a generic scene by provider kind otherwise. */
  photoUrl?: string | null;
}) {
  const t = useTranslations("logistics");
  const hq = provider.headquarters;
  const region = provider.regions[0];
  const cover = providerCoverImage(provider);
  const location = [hq ? `${hq.city}, ${hq.country}` : null, region].filter(Boolean).join(" · ");
  const chips = provider.coverage.slice(0, MAX_CHIPS);
  const extraChips = provider.coverage.length - chips.length;

  return (
    <article
      className="glass-card glass-hover flex h-full flex-col overflow-hidden"
      data-testid="logistics-provider-card"
    >
      <div className="relative h-32 shrink-0 overflow-hidden bg-slate-100">
        <ImageWithFallback
          src={photoUrl}
          fallbackSrc={cover.src}
          placeholderSrc={cover.src}
          alt={photoUrl ? t("photoAlt", { name: provider.name }) : t(`coverAlt.${cover.scene}`)}
          className="absolute inset-0 h-full w-full object-cover"
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
          quality={70}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/45 via-navy-deep/5 to-transparent" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="relative -mt-7 flex items-end justify-between gap-3">
          <span className="rounded-[14px] bg-white p-0.5 shadow-card">
            <ProviderBadge provider={provider} logoUrl={logoUrl} />
          </span>
          <span className="mb-0.5 truncate rounded-md bg-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-cyan">
            {t(`kind.${provider.kind}`)}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 text-base font-bold leading-tight text-ink">
          <Link href={logisticsProviderHref(provider.id)} className="hover:text-cyan">
            {provider.name}
          </Link>
        </h3>

        {location && (
          <p className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-ink-dim" title={location}>
            {hq ? <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            <span className="truncate">{location}</span>
          </p>
        )}

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-muted">{provider.description}</p>

        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("coverage")}>
          {chips.map((c) => (
            <li
              key={c}
              className="max-w-full truncate rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted"
            >
              {c}
            </li>
          ))}
          {extraChips > 0 && (
            <li
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-ink-dim"
              title={provider.coverage.slice(MAX_CHIPS).join(", ")}
            >
              +{extraChips}
            </li>
          )}
        </ul>

        <div className="mt-auto space-y-2 pt-4">
          <SupplierCardContact supplierId={provider.id} supplierName={provider.name} />
          <div className="flex gap-2">
            <Link href={logisticsProviderHref(provider.id)} className="btn-secondary flex-1 justify-center !py-2 text-xs">
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
      </div>
    </article>
  );
}
