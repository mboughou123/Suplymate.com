import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import {
  HOME_SUPPLIERS_BAND,
  getSupplierBandHref,
} from "@/lib/home-suppliers-band";

export default async function HomeSuppliersBand() {
  const t = await getTranslations("homeSuppliers");

  return (
    <section
      className="border-b border-slate-100/80 bg-base section-y-tight"
      aria-labelledby="suppliers-band-heading"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2
            id="suppliers-band-heading"
            className="mt-3 font-display text-display text-ink text-balance"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <ul className="mt-block-lg grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_SUPPLIERS_BAND.map((entry) => {
            const href = getSupplierBandHref(entry);
            return (
              <li key={entry.key}>
                <Link
                  href={href}
                  className="group panel-glass panel-glass-hover flex h-full flex-col overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <Image
                      src={entry.image}
                      alt={t(`${entry.key}Caption`)}
                      width={entry.imageWidth}
                      height={entry.imageHeight}
                      className="h-full w-full object-cover transition duration-500 ease-cinema group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-heading-sm text-navy">
                      {t(`${entry.key}Name`)}
                    </h3>
                    <p className="mt-1.5 inline-flex items-start gap-1.5 text-sm text-ink-muted">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                      {t(`${entry.key}Location`)}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-dim">
                      {t(`${entry.key}Caption`)}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan transition group-hover:gap-2.5">
                      {t("viewProfile")}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-block text-center">
          <Link href="/suppliers" className="btn-secondary px-6 py-3 text-sm">
            {t("exploreDirectory")}
          </Link>
        </div>
      </div>
    </section>
  );
}
