// Catalogue products derived from the phase-1 factory pack.
//
// No fabricated prices — public UI shows "Contact supplier for pricing" when
// basePrice is null (see public-products.ts). Status is approved so the pack
// surfaces after merge without a production DB import.

import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import { defaultMoqForCategory } from "@/data/supplier-bundle";
import type { SupplierCategory } from "@/data/suppliers";
import { collectFactoryPhotoUrls } from "@/lib/phase1";

function slugifyProduct(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function productsFromPhase1(): ScrapedProduct[] {
  const out: ScrapedProduct[] = [];
  const scrapedAt = "2026-09-01T00:00:00.000Z";

  for (const s of phase1Suppliers) {
    const category = (s.category ?? "Industrial Parts") as ProductCategory;
    const moq = s.moq || defaultMoqForCategory(s.category as SupplierCategory | undefined);
    const gallery = collectFactoryPhotoUrls(s);
    const names = s.products?.length ? s.products : [`${s.name} industrial supply`];

    for (const productName of names) {
      const slug = slugifyProduct(productName);
      out.push({
        id: `phase1-${s.id}-${slug}`,
        supplierId: s.id,
        supplierName: s.name,
        supplierLogo: s.logoUrl ?? null,
        supplierCountry: s.country ?? null,
        name: productName,
        slug,
        category,
        images: gallery,
        videos: [],
        basePrice: null,
        priceUnit: null,
        commissionRate: null,
        currency: "USD",
        moq,
        shippingTime: null,
        description: s.description
          ? `${productName} from ${s.name}. ${s.description.slice(0, 280)}`
          : `${productName} supplied by ${s.name}.`,
        shortDescription: `${productName} — ${s.name}`,
        specifications: {
          Supplier: s.name,
          Category: category,
          ...(s.country ? { Country: s.country } : {}),
        },
        customizationOptions: [],
        certifications: (s.certificationsDetailed ?? []).map((c) => c.name).filter(Boolean),
        rating: s.googleRating ?? s.rating ?? null,
        reviewCount: s.googleReviews ?? s.reviewCount ?? null,
        sourceUrl: s.sourceUrl ?? s.website ?? `phase1://${s.id}/${slug}`,
        productUrl: s.website ?? null,
        verifiedSupplier: Boolean(s.verified),
        status: "approved",
        scrapedAt,
      });
    }
  }
  return out;
}

export const phase1Products: ScrapedProduct[] = productsFromPhase1();
