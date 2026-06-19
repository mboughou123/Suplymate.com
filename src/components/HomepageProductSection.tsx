import Link from "next/link";
import { ArrowRight, Boxes } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { getProductsFromDb } from "@/lib/data-service";
import { getProductCardData } from "@/lib/product-detail";
import { getProductFallbackImage } from "@/lib/image-fallback";
import type { Product } from "@/data/products";
import HomepageProductCard, {
  type HomepageProductCardProps,
} from "@/components/HomepageProductCard";

const MAX_CARDS = 8;

function toCardProps(p: Product): HomepageProductCardProps & { hasRealPhoto: boolean } {
  const d = getProductCardData(p);
  return {
    id: d.id,
    name: d.name,
    category: d.category,
    image: d.imageUrl,
    imageFallback: getProductFallbackImage(d.name, d.category),
    startingPriceLabel: d.bulkPriceLabel,
    moq: d.moq,
    shippingTime: d.shippingTime,
    supplierCount: p.supplierCount,
    verified: d.verified,
    href: `/products/${d.id}`,
    hasRealPhoto: d.hasRealPhoto,
  };
}

export default async function HomepageProductSection() {
  const products = await getProductsFromDb();
  // Homepage rule: ONLY show products that resolve to a REAL photograph (their
  // own or their linked supplier's). Icon/graphic-only cards are excluded so the
  // showcase always looks like a real catalogue, never a wall of placeholders.
  const picks = products
    .map(toCardProps)
    .filter((c) => c.hasRealPhoto)
    .slice(0, MAX_CARDS);

  if (picks.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-4rem] top-10 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute left-[-4rem] bottom-10 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
      </div>

      <div className="relative container-page">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal">
            <Boxes className="h-3.5 w-3.5" aria-hidden />
            Sourcing catalogue
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">
            Products Businesses Can Source
          </h2>
          <p className="mt-3 text-ink-muted">
            From raw materials to finished goods — compare offers from vetted
            suppliers and buy at the right price, with transparent MOQs and
            delivery times.
          </p>
        </AnimatedSection>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {picks.map((product, i) => (
            <AnimatedSection key={product.id} delay={(i % 4) * 0.08} from="up">
              <HomepageProductCard {...product} />
            </AnimatedSection>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/products" className="btn-secondary px-6 py-3">
            Browse all products
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
