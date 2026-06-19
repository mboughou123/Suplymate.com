import Link from "next/link";
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
  const all = await getSuppliersFromDb();

  // Respect the verification gate — only verified suppliers are shown publicly.
  const verified = all.filter((s) => toDisplaySupplier(s).verified);
  // Prefer image-bearing suppliers so the homepage feels populated and alive.
  const withImages = verified.filter(hasRealImage);
  const pool = withImages.length >= MAX_CARDS ? withImages : verified;
  const picks = pool.slice(0, MAX_CARDS).map(toCardProps);

  if (picks.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-10 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-10 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
      </div>

      <div className="relative container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Verified network
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">
            Verified Suppliers on Suplymate
          </h2>
          <p className="mt-3 text-ink-muted">
            Real manufacturers and distributors — vetted for reliability,
            compliance, and delivery performance, with verified profiles, photos,
            and ratings.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((supplier, i) => (
            <Reveal key={supplier.id} delay={i * 70}>
              <HomepageSupplierCard {...supplier} />
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/suppliers" className="btn-secondary px-6 py-3">
            Explore all suppliers
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
