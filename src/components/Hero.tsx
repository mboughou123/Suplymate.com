import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Globe2, Search, Package, ShieldCheck, Bot } from "lucide-react";
import TrustBadge from "@/components/TrustBadge";
import HeroHeading from "@/components/HeroHeading";
import ImageWithFallback from "@/components/ImageWithFallback";
import { GENERIC_PRODUCT_PLACEHOLDER } from "@/lib/image-fallback";
import { getHomepageProducts, type HomepageProduct } from "@/lib/homepage-products";

export default async function Hero() {
  const t = await getTranslations("hero");
  const products = await getHomepageProducts(3);

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 ai-grid-bg opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />

      <div className="relative container-page py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="max-w-2xl text-center lg:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan-soft px-3.5 py-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-cyan">
              <Package className="h-3.5 w-3.5" aria-hidden />
              {t("badge")}
            </span>

            <HeroHeading />

            <p className="mx-auto mt-5 max-w-xl text-body-lg text-ink-muted lg:mx-0">
              {t("subtitle")}
            </p>

            <form
              action="/products"
              className="group mt-8 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card transition-shadow duration-200 focus-within:border-cyan/50 focus-within:shadow-focus sm:flex-row"
              role="search"
            >
              <div className="flex flex-1 items-center gap-2.5 px-3.5">
                <Search
                  className="h-5 w-5 shrink-0 text-ink-dim transition-colors group-focus-within:text-cyan"
                  aria-hidden
                />
                <label htmlFor="hero-search" className="sr-only">
                  {t("searchLabel")}
                </label>
                <input
                  id="hero-search"
                  type="search"
                  name="q"
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent py-3.5 text-body-sm text-ink placeholder:text-ink-dim focus:outline-none"
                />
              </div>
              <button type="submit" className="btn-accent px-7 py-3.5 sm:shrink-0">
                {t("searchButton")}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start">
              <Link
                href="/suppliers"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-cyan transition-colors hover:text-navy cursor-pointer"
              >
                <Search className="h-4 w-4" aria-hidden />
                {t("findSuppliers")}
              </Link>
              <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-cyan transition-colors hover:text-navy cursor-pointer"
              >
                <Package className="h-4 w-4" aria-hidden />
                {t("exploreProducts")}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              <TrustBadge icon={Globe2} label={t("trustVerifiedNetwork")} />
              <TrustBadge icon={Bot} label={t("trustAiMatching")} />
              <TrustBadge icon={ShieldCheck} label={t("trustProcurementSupport")} />
            </div>
          </div>

          {products.length > 0 ? (
            <aside className="mx-auto w-full max-w-lg lg:max-w-none" aria-label={t("liveListings")}>
              <p className="mb-3 text-center text-caption font-semibold uppercase tracking-[0.12em] text-ink-dim lg:text-start">
                {t("liveListings")}
              </p>
              <ul className="grid gap-3">
                {products.map((product) => (
                  <li key={product.id}>
                    <HeroProductRow product={product} />
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroProductRow({ product }: { product: HomepageProduct }) {
  return (
    <Link
      href={product.href}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card transition-all duration-200 ease-cinema hover:border-cyan/30 hover:shadow-cardHover cursor-pointer"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-base">
        <ImageWithFallback
          src={product.image}
          fallbackSrc={product.imageFallback}
          placeholderSrc={GENERIC_PRODUCT_PLACEHOLDER}
          alt={product.name}
          sizes="64px"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-ink group-hover:text-cyan">
          {product.name}
        </p>
        <p className="truncate text-caption text-ink-muted">{product.supplierName}</p>
        {product.priceLabel ? (
          <p className="mt-0.5 text-caption font-semibold tabular-nums text-ink">
            {product.priceLabel}
          </p>
        ) : null}
      </div>
      <span className="hidden shrink-0 rounded-full bg-base px-2.5 py-1 text-caption font-medium text-ink-dim sm:inline">
        {product.category}
      </span>
    </Link>
  );
}
