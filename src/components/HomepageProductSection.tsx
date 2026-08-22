import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Boxes } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import HomepageProductCard from "@/components/HomepageProductCard";
import { getHomepageProducts } from "@/lib/homepage-products";

const MAX_CARDS = 8;

export default async function HomepageProductSection() {
  const t = await getTranslations("home");
  const picks = await getHomepageProducts(MAX_CARDS);

  if (picks.length === 0) return null;

  return (
    <section className="relative py-20 sm:py-24">
      <div className="container-page">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/25 bg-teal/5 px-3 py-1 eyebrow text-teal">
            <Boxes className="h-3.5 w-3.5" aria-hidden />
            {t("sourcingCatalogue")}
          </span>
          <h2 className="mt-4 font-display text-display text-ink">{t("productsTitle")}</h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("productsSubtitle")}</p>
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
            {t("browseAllProducts")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
