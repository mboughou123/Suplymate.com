import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Globe2, MapPin } from "lucide-react";
import {
  featuredInsuranceProviders,
  logisticsDirectoryHref,
  logisticsProviderHref,
  providerCoverImage,
} from "@/data/logistics-providers";
import { getPublishedProviderLogos, getPublishedProviderPhotos } from "@/lib/media-store";
import ProviderBadge from "@/components/logistics/ProviderBadge";
import ImageWithFallback from "@/components/ImageWithFallback";

const HOME_INSURERS = 6;

async function loadProviderMedia(): Promise<{ logos: Record<string, string>; photos: Record<string, string[]> }> {
  try {
    const [logos, photos] = await Promise.all([getPublishedProviderLogos(), getPublishedProviderPhotos()]);
    return { logos, photos };
  } catch {
    return { logos: {}, photos: {} };
  }
}

/** Homepage band of cargo insurers, placed after the products grid. */
export default async function HomeInsuranceSection() {
  const [t, tLogistics, media] = await Promise.all([
    getTranslations("homeInsurance"),
    getTranslations("logistics"),
    loadProviderMedia(),
  ]);
  const providers = featuredInsuranceProviders(media.logos, HOME_INSURERS);
  if (providers.length === 0) return null;

  return (
    <section
      id="insurance"
      className="border-b border-slate-100/80 bg-base section-y-tight scroll-mt-28"
      aria-labelledby="home-insurance-heading"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2 id="home-insurance-heading" className="mt-3 font-display text-display text-ink text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <ul className="mt-block grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => {
            const cover = providerCoverImage(provider);
            const photo = media.photos[provider.id]?.[0];
            const hq = provider.headquarters;
            const location = hq ? `${hq.city}, ${hq.country}` : provider.regions[0];
            return (
              <li key={provider.id}>
                <Link
                  href={logisticsProviderHref(provider.id)}
                  className="glass-card glass-hover group flex h-full flex-col overflow-hidden"
                >
                  <span className="relative block h-28 overflow-hidden bg-slate-100">
                    <ImageWithFallback
                      src={photo}
                      fallbackSrc={cover.src}
                      placeholderSrc={cover.src}
                      alt={photo ? tLogistics("photoAlt", { name: provider.name }) : tLogistics(`coverAlt.${cover.scene}`)}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      quality={70}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-navy-deep/45 to-transparent" aria-hidden />
                  </span>
                  <span className="flex flex-1 flex-col px-5 pb-5">
                    <span className="relative -mt-6 flex items-end justify-between gap-3">
                      <span className="rounded-[14px] bg-white p-0.5 shadow-card">
                        <ProviderBadge provider={provider} logoUrl={media.logos[provider.id]} />
                      </span>
                      <span className="mb-0.5 truncate rounded-md bg-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-cyan">
                        {tLogistics(`kind.${provider.kind}`)}
                      </span>
                    </span>
                    <span className="mt-3 line-clamp-2 text-base font-bold leading-tight text-ink group-hover:text-cyan">
                      {provider.name}
                    </span>
                    {location && (
                      <span className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-ink-dim">
                        {hq ? <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                        <span className="truncate">{location}</span>
                      </span>
                    )}
                    <span className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-muted">{provider.description}</span>
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-cyan transition-all group-hover:gap-2">
                      {tLogistics("viewProfile")}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-block text-center">
          <Link href={logisticsDirectoryHref("insurance")} className="btn-secondary px-6 py-3 text-sm">
            {t("cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mx-auto mt-4 max-w-2xl text-xs leading-relaxed text-ink-dim">{tLogistics("disclaimer")}</p>
        </div>
      </div>
    </section>
  );
}
