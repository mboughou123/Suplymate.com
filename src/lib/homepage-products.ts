import { getProductsFromDb } from "@/lib/data-service";
import { getProductCardData } from "@/lib/product-detail";
import { getProductFallbackImage } from "@/lib/image-fallback";
import { isRealProductName } from "@/lib/product-quality";
import type { HomepageProductCardProps } from "@/components/HomepageProductCard";

export type HomepageProduct = HomepageProductCardProps & { hasRealPhoto: boolean };

export async function getHomepageProducts(limit = 8): Promise<HomepageProduct[]> {
  const products = await getProductsFromDb();
  return products
    .filter((p) => isRealProductName(p.name) && Boolean(p.unit))
    .map((p) => {
      const d = getProductCardData(p);
      return {
        id: d.id,
        name: d.name,
        category: d.category,
        image: d.imageUrl,
        imageFallback: getProductFallbackImage(d.name, d.category),
        priceLabel: d.priceLabel,
        moq: d.moq,
        shippingTime: d.shippingTime,
        supplierName: d.supplierName,
        href: `/products/${d.id}`,
        hasRealPhoto: d.hasRealPhoto,
      };
    })
    .filter((c) => c.hasRealPhoto && c.priceLabel)
    .slice(0, limit);
}
