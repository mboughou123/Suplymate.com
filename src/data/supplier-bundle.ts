import type { ProductCategory, ProductStatus } from "@/data/products";
import type { SupplierCategory } from "@/data/suppliers";

/**
 * One product entry inside a supplier bundle JSON file.
 * `price` is the supplier base (wholesale) price before platform commission.
 */
export type SupplierBundleProduct = {
  name: string;
  /** Public image URL, or list of gallery URLs. */
  image?: string | string[];
  /** Supplier base price (maps to ScrapedProduct.basePrice). */
  price: number;
  moq?: string;
  category?: ProductCategory;
  description?: string;
  specifications?: Record<string, string>;
  /** Per-product commission override; omit to use global COMMISSION_RATE. */
  commissionRate?: number;
  status?: ProductStatus;
};

/**
 * Supplier bundle JSON shape for bulk import (logo, banner, product media).
 *
 * @example scripts/import/examples/metalworks-china.json
 */
export type SupplierBundle = {
  supplierName: string;
  logo?: string;
  bannerImage?: string;
  /** Slug id; generated from supplierName when omitted. */
  supplierId?: string;
  category?: SupplierCategory;
  country?: string;
  website?: string;
  moq?: string;
  description?: string;
  currency?: string;
  commissionRate?: number;
  status?: ProductStatus;
  products: SupplierBundleProduct[];
};

const CATEGORY_INDUSTRY: Record<SupplierCategory, string> = {
  "Steel & Metals": "Metal",
  "Cables & Electrical": "Electrotechnical & Cabling",
  "Tubes & Pipes": "Metal",
  Packaging: "Plastics & Packaging",
  Construction: "Construction & BTP",
  "Industrial Parts": "Industrial Equipment",
};

const CATEGORY_MOQ: Record<SupplierCategory, string> = {
  "Steel & Metals": "5 tons",
  "Cables & Electrical": "500 m",
  "Tubes & Pipes": "2 tons",
  Packaging: "2,000 units",
  Construction: "1 pallet",
  "Industrial Parts": "10 units",
};

export function slugifySupplierId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function normalizeBundleImages(image?: string | string[]): string[] {
  if (!image) return [];
  return (Array.isArray(image) ? image : [image]).filter(Boolean);
}

export function industryForCategory(category?: SupplierCategory): string {
  if (category && CATEGORY_INDUSTRY[category]) return CATEGORY_INDUSTRY[category];
  return "Industrial Equipment";
}

export function defaultMoqForCategory(category?: SupplierCategory): string {
  if (category && CATEGORY_MOQ[category]) return CATEGORY_MOQ[category];
  return "Contact for MOQ";
}

export function parseSupplierBundle(raw: unknown): SupplierBundle {
  if (!raw || typeof raw !== "object") {
    throw new Error("Bundle must be a JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  const supplierName = typeof obj.supplierName === "string" ? obj.supplierName.trim() : "";
  if (!supplierName) throw new Error("Bundle missing required field: supplierName.");

  const productsRaw = obj.products;
  if (!Array.isArray(productsRaw) || productsRaw.length === 0) {
    throw new Error("Bundle must include a non-empty products array.");
  }

  const products: SupplierBundleProduct[] = productsRaw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`products[${i}] must be an object.`);
    }
    const p = item as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (!name) throw new Error(`products[${i}] missing required field: name.`);

    const price =
      typeof p.price === "number"
        ? p.price
        : typeof p.price === "string"
          ? parseFloat(p.price)
          : NaN;
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`products[${i}] must have a valid numeric price.`);
    }

    return {
      name,
      image: p.image as SupplierBundleProduct["image"],
      price,
      moq: typeof p.moq === "string" ? p.moq : undefined,
      category: p.category as ProductCategory | undefined,
      description: typeof p.description === "string" ? p.description : undefined,
      specifications:
        p.specifications && typeof p.specifications === "object"
          ? (p.specifications as Record<string, string>)
          : undefined,
      commissionRate:
        typeof p.commissionRate === "number" ? p.commissionRate : undefined,
      status: p.status as ProductStatus | undefined,
    };
  });

  return {
    supplierName,
    logo: typeof obj.logo === "string" ? obj.logo : undefined,
    bannerImage: typeof obj.bannerImage === "string" ? obj.bannerImage : undefined,
    supplierId: typeof obj.supplierId === "string" ? obj.supplierId.trim() : undefined,
    category: obj.category as SupplierCategory | undefined,
    country: typeof obj.country === "string" ? obj.country : undefined,
    website: typeof obj.website === "string" ? obj.website : undefined,
    moq: typeof obj.moq === "string" ? obj.moq : undefined,
    description: typeof obj.description === "string" ? obj.description : undefined,
    currency: typeof obj.currency === "string" ? obj.currency : undefined,
    commissionRate:
      typeof obj.commissionRate === "number" ? obj.commissionRate : undefined,
    status: obj.status as ProductStatus | undefined,
    products,
  };
}
