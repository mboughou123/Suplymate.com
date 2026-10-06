// Server-side lookups for the media push: does the entity exist, which
// domains are its own website, and (for supplier certificates) the
// Certification row the scan attaches to.

import { prisma } from "@/lib/prisma";
import { getSupplierById, getProductByIdAsync } from "@/lib/data-service";
import { getScrapedProduct } from "@/lib/scraped-products-store";
import { getLogisticsProvider, LOGISTICS_CATEGORY_ID } from "@/data/logistics-providers";
import { alibabaStoreFromRecord, officialDomains } from "./provenance";
import { productIndustry, supplierIndustry, type MediaIndustryId } from "./industry";
import type { MediaCertificationMeta, MediaTarget } from "./manifest";

export type ResolvedEntity = {
  target: MediaTarget;
  id: string;
  name: string;
  officialDomains: string[];
  industry: MediaIndustryId | null;
  /** Owning supplier (products and certifications). */
  supplierId?: string;
  /** Whether a Supplier row exists — certificates need one to attach to. */
  supplierInDatabase: boolean;
  /**
   * Set when this supplier's own record (website, sourceUrl or alibabaUrl)
   * is an Alibaba storefront. Product photos may use the same store.
   */
  alibabaStoreHost: string | null;
};

type SupplierFacts = {
  id: string;
  name: string;
  website: string | null;
  sourceUrl: string | null;
  alibabaUrl: string | null;
  industry: MediaIndustryId | null;
  inDatabase: boolean;
};

async function supplierFacts(id: string): Promise<SupplierFacts | null> {
  try {
    const row = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, name: true, website: true, sourceUrl: true, industry: true, category: true },
    });
    if (row) {
      return {
        id: row.id,
        name: row.name,
        website: row.website,
        sourceUrl: row.sourceUrl,
        alibabaUrl: null,
        industry: supplierIndustry(row),
        inDatabase: true,
      };
    }
  } catch {
    // no DB — fall back to the bundled directory
  }
  const s = await getSupplierById(id);
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    website: s.website ?? null,
    sourceUrl: s.sourceUrl ?? null,
    alibabaUrl: s.alibabaUrl ?? null,
    industry: supplierIndustry(s),
    inDatabase: false,
  };
}

export async function resolveMediaEntity(target: MediaTarget, id: string): Promise<ResolvedEntity | null> {
  switch (target) {
    case "supplier": {
      const s = await supplierFacts(id);
      if (!s) return null;
      return {
        target,
        id: s.id,
        name: s.name,
        officialDomains: officialDomains([s.website]),
        industry: s.industry,
        supplierId: s.id,
        supplierInDatabase: s.inDatabase,
        alibabaStoreHost: alibabaStoreFromRecord([s.website, s.sourceUrl, s.alibabaUrl]),
      };
    }
    case "product": {
      const scraped = await getScrapedProduct(id);
      const product = scraped ?? (await getProductByIdAsync(id));
      if (!product) return null;
      const supplier = product.supplierId ? await supplierFacts(product.supplierId) : null;
      return {
        target,
        id: product.id,
        name: product.name,
        officialDomains: officialDomains([product.productUrl, product.sourceUrl, supplier?.website]),
        industry: productIndustry(product),
        supplierId: product.supplierId,
        supplierInDatabase: supplier?.inDatabase ?? false,
        alibabaStoreHost: supplier ? alibabaStoreFromRecord([supplier.website, supplier.sourceUrl, supplier.alibabaUrl]) : null,
      };
    }
    case "certification": {
      let cert: { id: string; name: string; supplierId: string } | null = null;
      try {
        cert = await prisma.certification.findUnique({ where: { id }, select: { id: true, name: true, supplierId: true } });
      } catch {
        return null;
      }
      if (!cert) return null;
      const supplier = await supplierFacts(cert.supplierId);
      return {
        target,
        id: cert.id,
        name: cert.name,
        officialDomains: officialDomains([supplier?.website]),
        industry: supplier?.industry ?? null,
        supplierId: cert.supplierId,
        supplierInDatabase: true,
        alibabaStoreHost: null,
      };
    }
    case "logistics-provider": {
      const p = getLogisticsProvider(id);
      if (!p) return null;
      return {
        target,
        id: p.id,
        name: p.name,
        officialDomains: officialDomains([p.website, p.homepage, p.quoteUrl, ...p.sourceUrls]),
        industry: LOGISTICS_CATEGORY_ID,
        supplierInDatabase: false,
        alibabaStoreHost: null,
      };
    }
    default: {
      const unreachable: never = target;
      throw new Error(`unknown media target ${String(unreachable)}`);
    }
  }
}

/**
 * The Certification row a supplier's certificate scan attaches to. Matched by
 * name (case-insensitive); created as "claimed" — a pushed scan is what the
 * supplier shows on its site, never proof that Suplymate verified it.
 */
export async function ensureClaimedCertification(
  supplierId: string,
  meta: MediaCertificationMeta,
  sourceUrl: string
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.certification.findFirst({
    where: { supplierId, name: { equals: meta.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };
  const row = await prisma.certification.create({
    data: {
      supplierId,
      name: meta.name,
      type: meta.type ?? null,
      issuingOrg: meta.issuingOrg ?? null,
      certificateNumber: meta.certificateNumber ?? null,
      issueDate: meta.issueDate ? new Date(`${meta.issueDate}T00:00:00Z`) : null,
      expirationDate: meta.expirationDate ? new Date(`${meta.expirationDate}T00:00:00Z`) : null,
      verificationUrl: meta.verificationUrl ?? null,
      sourceUrl,
      status: "claimed",
    },
    select: { id: true },
  });
  return { id: row.id, created: true };
}
