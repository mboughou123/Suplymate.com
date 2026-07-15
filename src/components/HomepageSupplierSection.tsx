import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Reveal from "@/components/Reveal";
import { getSuppliersFromDb } from "@/lib/data-service";
import { toDisplaySupplier } from "@/lib/supplier-display";
import { getSupplierFallbackImage } from "@/lib/image-fallback";
import type { Supplier } from "@/data/suppliers";
import HomepageSupplierCard, {
  type HomepageSupplierCardProps,
} from "@/components/HomepageSupplierCard";

const MAX_CARDS = 6;

function hasRealImage(s: Supplier): boolean {
  return Boolean(s.imageUrl) || Boolean(s.supplierImages && s.supplierImages.length > 0);
}

function toCardProps(s: Supplier): HomepageSupplierCardProps {
  const d = toDisplaySupplier(s);
  const description =
    s.description?.trim() ||
    `${d.name} is a verified ${d.categoryLabel.toLowerCase()} supplier based in ${d.city}, ${d.country}, vetted for reliability, compliance, and delivery performance on Suplymate.`;
  return {
    id: d.id,
    name: d.name,
    category: d.categoryLabel,
    location: d.location,
    country: d.country,
    flag: d.flag,
    rating: d.rating,
    reviewCount: d.reviewCount,
    verified: d.verified,
    description,
    coverImage: d.imageUrl,
    coverFallback: getSupplierFallbackImage(s.category ?? s.industry, d.name),
    logoUrl: d.logoUrl,
    logoInitials: d.logoText,
    logoGradient: d.logoGradient,
    href: `/supplier/${d.id}`,
  };
}

export default async function HomepageSupplierSection() {
  const t = await getTranslations("home");
  const all = await getSuppliersFromDb();

  const verified = all.filter((s) => toDisplaySupplier(s).verified);
  const withImages = verified.filter(hasRealImage);
  const pool = withImages.length >= MAX_CARDS ? withImages : verified;
  const picks = pool.slice(0, MAX_CARDS).map(toCardProps);

  if (picks.length === 0) return null;

  return (
    <section className="relative border-y border-slate-100 bg-base py-20 sm:py-24">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/25 bg-cyan-soft px-3 py-1 eyebrow text-cyan">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t("verifiedNetwork")}
          </span>
          <h2 className="mt-4 font-display text-display text-ink">
            {t("verifiedSuppliersTitle")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">
            {t("verifiedSuppliersSubtitle")}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((supplier, i) => (
            <Reveal key={supplier.id} delay={(i % 3) * 70}>
              <HomepageSupplierCard {...supplier} />
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/suppliers" className="btn-secondary px-6 py-3">
            {t("exploreAllSuppliers")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
