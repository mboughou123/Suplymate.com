import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Star, ChevronRight, Layers, Wrench, Tag } from "lucide-react";
import { products } from "@/data/products";
import { getProductByIdAsync } from "@/lib/data-service";
import { getProductDetail } from "@/lib/product-detail";
import { getPublishedProductImageUrls } from "@/lib/media-public";
import {
  getComparisonByProductId,
  getDefaultComparison,
} from "@/data/comparisons";
import SupplierComparisonTable from "@/components/SupplierComparisonTable";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel";
import ProductSupplierBox from "@/components/product/ProductSupplierBox";
import ProductDescription from "@/components/product/ProductDescription";
import RecommendedProducts from "@/components/product/RecommendedProducts";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { parseMoq } from "@/lib/moq";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductByIdAsync(id);
  if (!product) return { title: "Product not found · Suplymate" };
  const detail = getProductDetail(product);
  return {
    title: `${product.name} · ${detail.supplier.name} | Suplymate`,
    description: `Buy ${product.name} from ${detail.supplier.name}. ${detail.displayFromLabel} per ${product.unit}, MOQ ${detail.moq}, ships in ${detail.leadTime}. Tiered bulk pricing, specs & reviews on Suplymate.`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductByIdAsync(id);
  if (!product) notFound();

  // Prefer admin-curated PUBLISHED media (primary first); fall back to the
  // product's existing image list when there is none.
  const publishedImages = await getPublishedProductImageUrls(product.id).catch(() => []);
  if (publishedImages.length) product.images = publishedImages;

  const detail = getProductDetail(product);
  const comparison =
    getComparisonByProductId(id) ?? getDefaultComparison(id, product.name);

  // Honest pricing gate: only show indicative tiers when a real supplier-listed
  // price exists. Scraped products with no public price fall back to a
  // "Contact supplier for pricing" state.
  const hasPublicPrice = (product.basePrice ?? product.priceMin ?? 0) > 0;

  return (
    <div className="min-h-screen bg-slate-50/50">
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
              {product.rating != null ? (
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <Star className="h-4 w-4 fill-mustard text-mustard" aria-hidden />
                  {product.rating.toFixed(1)}
                  {product.reviewCount != null && (
                    <span className="font-normal text-ink-dim">
                      ({product.reviewCount.toLocaleString()} supplier-site reviews)
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

            {/* Pricing */}
            {hasPublicPrice ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
                  Indicative pricing
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {detail.priceTiers.map((t) => (
                    <div key={t.minQty} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] text-ink-dim">{t.rangeLabel}</p>
                      <p className="mt-1 text-base font-bold text-cyan">
                        {t.priceLabel}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-dim">
                  Estimated from the supplier-listed price (incl. Suplymate service fee). Final
                  pricing is confirmed by the supplier in a quote. MOQ:{" "}
                  <span className="font-semibold text-ink">{detail.moq}</span>
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <p className="text-base font-semibold text-ink">Contact supplier for pricing</p>
                <p className="mt-1 text-xs text-ink-dim">
                  No public price is listed. Add this product to your cart and request a quote.
                  {detail.moq ? <> MOQ: <span className="font-semibold text-ink">{detail.moq}</span></> : null}
                </p>
              </div>
            )}

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
                  basePrice: hasPublicPrice ? product.basePrice ?? null : null,
                  currency: product.currency,
                  sourceUrl: product.productUrl ?? null,
                }}
              />
            </div>

            {/* Options */}
            <div className="mt-5 space-y-3">
              {detail.options.map((opt) => (
                <div key={opt.name}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Layers className="h-3.5 w-3.5 text-cyan" aria-hidden />
                    {opt.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {opt.values.map((v) => (
                      <span
                        key={v}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-cyan/50 hover:text-cyan"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Customization */}
            <div className="mt-5 rounded-xl border border-cyan/15 bg-cyan/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan">
                <Wrench className="h-3.5 w-3.5" aria-hidden />
                Customization available
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detail.customizationOptions.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] text-ink-muted"
                  >
                    <Tag className="h-3 w-3 text-teal" aria-hidden />
                    {c}
                  </span>
                ))}
              </div>
            </div>
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
            <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Illustrative specifications based on category norms and supplier-provided
              information. These are not independently verified — confirm exact specs,
              certifications, and tolerances with the supplier in your RFQ.
            </p>
            <ProductDescription
              sections={detail.descriptionSections}
              highlights={detail.highlights}
            />
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

        {/* Compare suppliers */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-ink">Compare suppliers for this product</h2>
          <p className="mt-1 text-sm text-ink-muted">{comparison.summary}</p>
          <div className="mt-4">
            <SupplierComparisonTable offers={comparison.offers} />
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
