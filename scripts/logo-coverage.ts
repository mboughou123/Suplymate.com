/**
 * Logo coverage for the frozen catalogue, plus the two media-needs exports:
 * Alibaba-sourced suppliers, and products that still have no real photograph.
 *
 *   npx tsx scripts/logo-coverage.ts
 *
 * Prints supplier and logistics-provider logo counts. Rewrites
 * media-batches/needs/alibaba-suppliers.json and
 * media-batches/needs/products-missing-images.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { suppliers } from "../src/data/suppliers";
import { approvedPackProducts, mergePackSuppliers, packSuppliers } from "../src/data/pack-catalog";
import { LOGISTICS_PROVIDERS } from "../src/data/logistics-providers";
import { MONO_ON_WHITE_LOGO_IDS } from "../src/lib/logo-tile";
import { alibabaStoreKey } from "../src/lib/media-bot/provenance";
import { hasRealProductImage, isRealImageUrl } from "../src/lib/image-fallback";
import { displayImageUrl, readImageAttribution } from "../src/lib/image-attribution";

const ROOT = process.cwd();

function storeUrlOf(urls: (string | null | undefined)[]): string | null {
  for (const url of urls) {
    if (alibabaStoreKey(url)) return url?.trim() ?? null;
  }
  return null;
}

function photoCount(imageUrl?: string | null, extra?: (string | null | undefined)[]): number {
  const urls = [imageUrl, ...(extra ?? [])].filter((url): url is string => isRealImageUrl(url));
  return new Set(urls.map((url) => displayImageUrl(url))).size;
}

function main() {
  const catalogue = mergePackSuppliers(suppliers);
  const suppliersWithLogo = catalogue.filter((supplier) => Boolean(supplier.logoUrl?.trim()));
  const providersWithLogo = LOGISTICS_PROVIDERS.filter((provider) => Boolean(provider.logo));
  const providersMissing = LOGISTICS_PROVIDERS.length - providersWithLogo.length;

  console.log("Logo coverage");
  console.log(`  suppliers: ${suppliersWithLogo.length} with a logo, ${catalogue.length - suppliersWithLogo.length} without (initials), ${catalogue.length} total`);
  console.log(`  logistics/insurance providers: ${providersWithLogo.length} with a logo, ${providersMissing} without (initials), ${LOGISTICS_PROVIDERS.length} total`);
  console.log(`  white logos with no coloured file (CSS mono on white): ${MONO_ON_WHITE_LOGO_IDS.join(", ") || "none"}`);

  const alibaba = new Map<string, { id: string; name: string; storeUrl: string; imageCount: number }>();
  for (const supplier of [...catalogue, ...packSuppliers]) {
    const urls = [supplier.website, supplier.sourceUrl, supplier.alibabaUrl];
    const storeUrl = storeUrlOf(urls);
    if (!storeUrl || alibaba.has(supplier.id)) continue;
    alibaba.set(supplier.id, {
      id: supplier.id,
      name: supplier.name,
      storeUrl,
      imageCount: photoCount(supplier.imageUrl, supplier.supplierImages),
    });
  }
  const alibabaRows = [...alibaba.values()].sort((a, b) => a.name.localeCompare(b.name));

  const missing = approvedPackProducts()
    .filter((product) => {
      const images = product.images
        .filter((url) => !readImageAttribution({ url }).aiGenerated)
        .map(displayImageUrl);
      return !hasRealProductImage({
        images,
        id: product.id,
        slug: product.slug ?? product.packSlug,
        supplierId: product.supplierId,
        productName: product.name,
        category: product.category,
      });
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      supplier: product.supplierName,
      supplierId: product.supplierId,
      category: product.category,
      keySpecs: {
        ...(product.moq ? { moq: product.moq } : {}),
        ...Object.fromEntries(Object.entries(product.specifications ?? {}).slice(0, 8)),
      },
    }))
    .sort((a, b) => a.supplier.localeCompare(b.supplier) || a.name.localeCompare(b.name));

  const needsDir = join(ROOT, "media-batches", "needs");
  mkdirSync(needsDir, { recursive: true });
  writeFileSync(join(needsDir, "alibaba-suppliers.json"), `${JSON.stringify(alibabaRows, null, 2)}\n`);
  writeFileSync(join(needsDir, "products-missing-images.json"), `${JSON.stringify(missing, null, 2)}\n`);

  console.log(`Alibaba-sourced suppliers: ${alibabaRows.length}`);
  console.log(`Products missing a real image: ${missing.length}`);
  console.log(`Wrote ${join("media-batches", "needs", "alibaba-suppliers.json")}`);
  console.log(`Wrote ${join("media-batches", "needs", "products-missing-images.json")}`);
}

main();
