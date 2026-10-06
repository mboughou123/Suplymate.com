// Gathers the inputs for computeMediaNeeds from the DB and bundled datasets.

import { prisma } from "@/lib/prisma";
import { listMedia } from "@/lib/media-store";
import { listAdminSuppliers } from "@/lib/suppliers-store";
import { listScrapedProducts } from "@/lib/scraped-products-store";
import { getProductsFromDb, getSuppliersFromDb } from "@/lib/data-service";
import { LOGISTICS_PROVIDERS } from "@/data/logistics-providers";
import type { MediaNeedsInput, NeedsProduct, NeedsSupplier } from "./needs";

type CertSource = { name: string; imageUrl?: string | null };

function mergeCerts(byName: Map<string, { name: string; hasScan: boolean }>, certs: CertSource[] | undefined) {
  for (const c of certs ?? []) {
    const name = c.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const prev = byName.get(key);
    byName.set(key, { name: prev?.name ?? name, hasScan: Boolean(prev?.hasScan || c.imageUrl) });
  }
}

export async function loadMediaNeedsInput(): Promise<MediaNeedsInput> {
  const [admin, publicSuppliers, scraped, publicProducts, supplierMedia, productMedia, providerMedia, certMedia] = await Promise.all([
    listAdminSuppliers(),
    getSuppliersFromDb(),
    listScrapedProducts(),
    getProductsFromDb(),
    listMedia({ entityType: "SUPPLIER" }),
    listMedia({ entityType: "PRODUCT" }),
    listMedia({ entityType: "LOGISTICS_PROVIDER" }),
    listMedia({ entityType: "CERTIFICATION" }),
  ]);

  const scannedCertIds = new Set(certMedia.map((m) => m.entityId).filter(Boolean));
  const certRows = await prisma.certification
    .findMany({ select: { id: true, name: true, supplierId: true, imageUrl: true } })
    .catch(() => [] as { id: string; name: string; supplierId: string; imageUrl: string | null }[]);
  const certsBySupplier = new Map<string, CertSource[]>();
  for (const c of certRows) {
    const list = certsBySupplier.get(c.supplierId) ?? [];
    list.push({ name: c.name, imageUrl: c.imageUrl || (scannedCertIds.has(c.id) ? "media" : null) });
    certsBySupplier.set(c.supplierId, list);
  }

  const suppliers = new Map<string, NeedsSupplier>();
  for (const s of admin) {
    const certs = new Map<string, { name: string; hasScan: boolean }>();
    mergeCerts(certs, s.certifications);
    mergeCerts(certs, certsBySupplier.get(s.id));
    suppliers.set(s.id, {
      id: s.id,
      name: s.name,
      website: s.website,
      sourceUrl: s.sourceUrl,
      category: s.category,
      industry: s.industry,
      products: s.products,
      hasLegacyLogo: Boolean(s.logoUrl),
      legacyPhotoCount: new Set([s.imageUrl, ...s.images].filter(Boolean)).size,
      certificates: [...certs.values()],
    });
  }
  for (const s of publicSuppliers) {
    if (suppliers.has(s.id)) continue;
    const certs = new Map<string, { name: string; hasScan: boolean }>();
    mergeCerts(certs, s.certificationsDetailed);
    mergeCerts(certs, certsBySupplier.get(s.id));
    suppliers.set(s.id, {
      id: s.id,
      name: s.name,
      website: s.website ?? null,
      sourceUrl: s.sourceUrl ?? null,
      alibabaUrl: s.alibabaUrl ?? null,
      category: s.category ?? null,
      industry: s.industry,
      products: s.products,
      hasLegacyLogo: Boolean(s.logoUrl),
      legacyPhotoCount: new Set([s.imageUrl, ...(s.supplierImages ?? [])].filter(Boolean)).size,
      certificates: [...certs.values()],
    });
  }

  const products = new Map<string, NeedsProduct>();
  for (const p of scraped) {
    products.set(p.id, {
      id: p.id,
      name: p.name,
      category: p.category,
      supplierId: p.supplierId,
      productUrl: p.productUrl ?? null,
      sourceUrl: p.sourceUrl,
      legacyImageCount: p.images.length,
    });
  }
  for (const p of publicProducts) {
    if (products.has(p.id)) continue;
    products.set(p.id, {
      id: p.id,
      name: p.name,
      category: p.category,
      supplierId: p.supplierId ?? null,
      productUrl: p.productUrl ?? null,
      sourceUrl: p.sourceUrl ?? null,
      legacyImageCount: p.images?.length ?? 0,
    });
  }

  return {
    suppliers: [...suppliers.values()],
    products: [...products.values()],
    providers: LOGISTICS_PROVIDERS.map((p) => ({ id: p.id, name: p.name, urls: [p.website, p.homepage, p.quoteUrl ?? "", ...p.sourceUrls] })),
    media: [...supplierMedia, ...productMedia, ...providerMedia],
  };
}
