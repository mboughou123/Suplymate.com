import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Star, ChevronRight, Wrench, Tag } from "lucide-react";
import { products } from "@/data/products";
import { getProductByIdAsync } from "@/lib/data-service";
import { getProductDetail } from "@/lib/product-detail";
import { getPublishedProductImageUrls } from "@/lib/media-public";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel";
import ProductSupplierBox from "@/components/product/ProductSupplierBox";
import ProductDescription from "@/components/product/ProductDescription";
import RecommendedProducts from "@/components/product/RecommendedProducts";
import AddToCartButton from "@/components/cart/AddToCartButton";
import SaveProductButton from "@/components/SaveProductButton";
import ReportButton from "@/components/ReportButton";
import { parseMoq } from "@/lib/moq";
import { getTranslations } from "next-intl/server";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

// No loading.tsx for this route on purpose: a loading boundary flushes the
// layout shell before the product lookup resolves, which pins the response at
// HTTP 200 and turns notFound() into a soft 404 that crawlers index.
export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const product = await getProductByIdAsync(id);
  if (!product) {
    return completeLocalizedMetadata({
      locale,
      pathname: `/products/${id}`,
      title: t("productNotFoundTitle"),
      description: t("productNotFoundDescription"),
      siteName: t("siteName"),
    });
  }
  const detail = getProductDetail(product);
  return completeLocalizedMetadata({
    locale,
    pathname: `/products/${id}`,
    title: t("productTitle", { product: product.name, supplier: detail.supplier.name }),
    // The description used to interpolate a price range, MOQ and lead time, all
    // of which were generated when the record had none.
    description: t("productDescription", {
      product: product.name,
      supplier: detail.supplier.name,
    }),
    siteName: t("siteName"),
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "products" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const product = await getProductByIdAsync(id);
  if (!product) notFound();

  // Prefer admin-curated PUBLISHED media (primary first); fall back to the
  // product's existing image list when there is none.
  const publishedImages = await getPublishedProductImageUrls(product.id).catch(() => []);
  if (publishedImages.length) product.images = publishedImages;

  const detail = getProductDetail(product);
  const { listedPrice } = detail;

  return (
    <div className="min-h-screen bg-base/50">
      <div className="container-page py-6">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
          <Link href="/" className="hover:text-cyan">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <Link href="/products" className="hover:text-cyan">Products</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-cyan">{detail.category}</span>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="truncate text-ink">{product.name}</span>
        </nav>

        {/* Hero */}
        <div className="mt-5 grid gap-8 lg:grid-cols-12">
          {/* Gallery */}
          <div className="lg:col-span-5">
            <ProductGallery images={detail.gallery} />
          </div>

          {/* Core info */}
          <div className="lg:col-span-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-cyan/10 px-2.5 py-1 text-xs font-semibold text-cyan">
                {detail.category}
              </span>
              {detail.supplier.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Verified supplier
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {product.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {detail.rating !== null ? (
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <Star className="h-4 w-4 fill-mustard text-mustard" aria-hidden />
                  {detail.rating.toFixed(1)}
                  {detail.reviewCount !== null && (
                    <span className="font-normal text-ink-dim">
                      ({detail.reviewCount.toLocaleString()} supplier-site reviews)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-ink-dim">No ratings yet</span>
              )}
              <Link href={detail.supplier.href} className="text-ink-muted hover:text-cyan">
                {detail.supplier.flag} {detail.supplier.name}
              </Link>
            </div>

            {/* Pricing. The four-band volume-discount grid that sat here was an
                invented price list; only the one listed price is published. */}
            <div className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-card">
              {listedPrice ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
                    {t("listedPrice")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-cyan">{listedPrice.priceLabel}</p>
                  <p className="mt-2 text-xs text-ink-dim">{t("priceNote")}</p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-ink">{tc("contactForPricing")}</p>
                  <p className="mt-1 text-xs text-ink-dim">{t("noPublicPriceNote")}</p>
                </>
              )}
              {detail.moq && (
                <p className="mt-2 text-xs text-ink-dim">
                  {t("moqLabel")}: <span className="font-semibold text-ink">{detail.moq}</span>
                </p>
              )}
            </div>

            {/* Procurement actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <AddToCartButton
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan/90"
                item={{
                  productId: product.id,
                  productName: product.name,
                  supplierId: product.supplierId ?? detail.supplier.id,
                  supplierName: product.supplierName ?? detail.supplier.name,
                  imageUrl: product.images?.[0] ?? null,
                  unit: product.priceUnit ?? product.unit ?? null,
                  moq: parseMoq(product.moq),
                  basePrice: listedPrice?.basePrice ?? null,
                  currency: product.currency,
                  sourceUrl: product.productUrl ?? null,
                }}
              />
              <SaveProductButton
                item={{
                  productId: product.id,
                  productName: product.name,
                  supplierId: product.supplierId ?? detail.supplier.id,
                  supplierName: product.supplierName ?? detail.supplier.name,
                  imageUrl: product.images?.[0] ?? null,
                  unit: product.priceUnit ?? product.unit ?? null,
                  basePrice: listedPrice?.basePrice ?? null,
                  currency: product.currency,
                }}
              />
              <ReportButton targetType="PRODUCT" targetId={product.id} />
            </div>

            {/* The "Grade" and "Surface" selectors that sat here offered values
                ("Premium", "Export grade", "Hot-dip galvanized", "Anodized")
                picked per product from a pool. No supplier had listed them. */}

            {/* Customization — only what the supplier published */}
            {detail.customizationOptions.length > 0 && (
              <div className="mt-5 rounded-xl border border-cyan/15 bg-cyan/5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan">
                  <Wrench className="h-3.5 w-3.5" aria-hidden />
                  Customization available
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.customizationOptions.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] text-ink-muted"
                    >
                      <Tag className="h-3 w-3 text-teal" aria-hidden />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Purchase sidebar */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <ProductPurchasePanel
                detail={detail}
                currency={product.currency}
                productName={product.name}
              />
            </div>
          </div>
        </div>

        {/* Description + supplier */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="mb-2 text-xl font-bold text-ink">Product details</h2>
            {detail.specs.length > 0 && (
              <p className="mb-5 rounded-lg bg-cyan-soft px-3 py-2 text-xs text-cyan">
                {t("specsNote")}
              </p>
            )}
            <ProductDescription sections={detail.descriptionSections} />
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="mb-5 text-xl font-bold text-ink">Supplier</h2>
            <ProductSupplierBox supplier={detail.supplier} />
          </div>
        </div>

        {/* Reviews — honest empty state. Reviews are only published after a
            confirmed on-platform interaction with the supplier (review policy). */}
        <section className="mt-12">
          <h2 className="mb-5 text-xl font-bold text-ink">Reviews</h2>
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm font-medium text-ink">No verified reviews yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink-dim">
              Suplymate only publishes reviews from buyers after a confirmed interaction with the
              supplier (an RFQ, quote, or conversation). See our{" "}
              <Link href="/review-policy" className="text-cyan hover:underline">
                review policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Compare suppliers — honest: only real quotes after RFQ */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-ink">Compare suppliers</h2>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm font-medium text-ink">No side-by-side offers yet</p>
            <p className="mx-auto mt-1 max-w-lg text-xs text-ink-dim">
              Suplymate does not fabricate competitor pricing or reliability scores. Add this
              product to your cart, submit an RFQ, and compare real supplier quotes on your{" "}
              <Link href="/rfqs" className="text-cyan hover:underline">
                RFQ dashboard
              </Link>
              . To compare suppliers in the directory, use{" "}
              <Link href="/suppliers" className="text-cyan hover:underline">
                supplier compare
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Recommended */}
        <section className="mt-12">
          <h2 className="mb-5 text-xl font-bold text-ink">Recommended for you</h2>
          <RecommendedProducts products={detail.recommended} />
        </section>
      </div>
    </div>
  );
}
