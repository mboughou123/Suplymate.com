"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ImageWithFallback from "@/components/ImageWithFallback";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";
import { getProductFallbackImage } from "@/lib/image-fallback";
import type { SteelMetalPackListing } from "@/lib/steel-metal-listings";

type Props = {
  listings: SteelMetalPackListing[];
  leafName: string;
};

export default function PackListingCards({ listings, leafName }: Props) {
  const t = useTranslations("steelMetal");
  const tp = useTranslations("products");

  if (listings.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-ink-muted">
        {t("relatedListingsEmpty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {listings.map((listing) => (
        <li key={listing.id} className="grid gap-4 p-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center">
          <Link href={listing.href} className="relative block h-20 w-full overflow-hidden rounded-xl bg-slate-100 sm:w-[5.5rem]">
            <ImageWithFallback
              src={listing.imageUrl}
              fallbackSrc={getProductFallbackImage(listing.name, "Steel & Metals")}
              alt={listing.name}
              sizes="88px"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </Link>
          <div className="min-w-0">
            <Link href={listing.href} className="cursor-pointer text-sm font-semibold text-ink transition-colors duration-200 hover:text-cyan">
              {listing.name}
            </Link>
            <p className="mt-1 text-xs text-ink-muted">{listing.supplierName}</p>
          </div>
          <ContactSupplierButton
            supplierId={listing.supplierId}
            supplierName={listing.supplierName}
            productName={`${leafName} — ${listing.name}`}
            productId={listing.id}
            quote
            label={tp("requestQuote")}
            className="btn-accent px-4 py-2 text-sm"
          />
        </li>
      ))}
    </ul>
  );
}
