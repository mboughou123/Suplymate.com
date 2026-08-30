import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
  const t = await getTranslations("home");
  const products = await getProductsFromDb();
  const picks = products
    .map(toCardProps)
    .filter((c) => c.hasRealPhoto)
    .slice(0, MAX_CARDS);

  if (picks.length === 0) return null;

  return (
    <section className="relative py-20 sm:py-24">
      <div className="container-page">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/25 bg-teal/5 px-3 py-1 eyebrow text-teal">
            <Boxes className="h-3.5 w-3.5" aria-hidden />
            {t("sourcingCatalogue")}
          </span>
          <h2 className="mt-4 font-display text-display text-ink">
            {t("productsTitle")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">
            {t("productsSubtitle")}
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
          <Link href="/products" className="btn-accent px-6 py-3">
            {t("browseAllProducts")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
