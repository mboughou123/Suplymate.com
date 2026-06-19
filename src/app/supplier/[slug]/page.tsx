import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSupplierById, getFallbackSupplierIds } from "@/lib/data-service";
import { getSupplierProfile } from "@/lib/supplier-profile";

import HeroSection from "@/components/supplier-profile/HeroSection";
import TrustPerformanceSection from "@/components/supplier-profile/TrustPerformanceSection";
import CompanyProfileSection from "@/components/supplier-profile/CompanyProfileSection";
import CertificationsSection from "@/components/supplier-profile/CertificationsSection";
import CertificationGallery from "@/components/supplier-profile/CertificationGallery";
import VerificationBadge from "@/components/VerificationBadge";
import FactoryMediaSection from "@/components/supplier-profile/FactoryMediaSection";
import ProductsSection from "@/components/supplier-profile/ProductsSection";
import ReviewsSection from "@/components/supplier-profile/ReviewsSection";
import AiInsightsSection from "@/components/supplier-profile/AiInsightsSection";
import StickyContactCard from "@/components/supplier-profile/StickyContactCard";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com"
).replace(/\/$/, "");

// Pre-render every supplier known to the deterministic dataset; unknown slugs
// are still resolved on demand (and fall back to the DB when available).
export const dynamicParams = true;

export async function generateStaticParams() {
  return getFallbackSupplierIds().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await getSupplierById(slug);
  if (!supplier) {
    return { title: "Supplier not found · Suplymate" };
  }
  const profile = getSupplierProfile(supplier);
  const title = `${profile.base.name} — Verified ${profile.base.categoryLabel} Supplier · Suplymate`;
  const url = `${SITE_URL}/supplier/${slug}`;

  return {
    title,
    description: profile.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: profile.metaDescription,
      url,
      siteName: "Suplymate",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: profile.metaDescription,
    },
  };
}

export default async function SupplierProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supplier = await getSupplierById(slug);
  if (!supplier) notFound();

  const profile = getSupplierProfile(supplier);
  const { base, trust } = profile;
  const url = `${SITE_URL}/supplier/${slug}`;

  // Real certification/media collected via import or the website scraper. Shown
  // alongside the generated profile content only when present.
  const realCertImages = supplier.certificationImages ?? [];
  const realCertDetails = supplier.certificationsDetailed ?? [];
  const realSupplierImages = supplier.supplierImages ?? [];
  const hasRealMedia =
    realCertImages.length > 0 || realCertDetails.length > 0 || realSupplierImages.length > 0;

  // schema.org structured data (Organization / LocalBusiness + AggregateRating)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": url,
    name: base.name,
    url,
    description: profile.metaDescription,
    address: {
      "@type": "PostalAddress",
      addressLocality: base.city,
      addressCountry: base.country,
    },
    ...(base.website ? { sameAs: [base.website] } : {}),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: base.rating.toFixed(1),
      reviewCount: base.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    makesOffer: profile.products.slice(0, 6).map((p) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: p.name },
      priceCurrency: "USD",
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Suppliers", item: `${SITE_URL}/suppliers` },
      { "@type": "ListItem", position: 2, name: base.name, item: url },
    ],
  };

  return (
    <div className="bg-base/40 min-h-screen pb-20 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Breadcrumb */}
      <nav className="container-page flex items-center gap-1.5 pt-4 text-xs text-ink-dim" aria-label="Breadcrumb">
        <Link href="/suppliers" className="hover:text-cyan">
          Suppliers
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-ink-muted">{base.name}</span>
        {supplier.verificationStatus && (
          <VerificationBadge status={supplier.verificationStatus} size="sm" className="ml-2" />
        )}
      </nav>

      <HeroSection profile={profile} />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="min-w-0">
          <TrustPerformanceSection profile={profile} />
          <CompanyProfileSection profile={profile} />
          <CertificationsSection profile={profile} />
          {hasRealMedia && (
            <section className="py-6">
              <h2 className="font-display text-lg font-bold text-ink">
                Information collected from the supplier
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Certifications and company media{" "}
                {supplier.sourceUrl
                  ? "collected from the supplier's public website"
                  : "provided during supplier import"}
                . These are claims made by the supplier.
              </p>
              {(realCertImages.length > 0 || realCertDetails.length > 0) && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Certification displayed on the supplier&rsquo;s website. Not independently
                  verified by Suplymate.
                </p>
              )}
              <div className="mt-4">
                <CertificationGallery
                  images={realCertImages}
                  certifications={realCertDetails}
                />
              </div>
              {realSupplierImages.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {realSupplierImages.slice(0, 12).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt={`${base.name} media ${i + 1}`}
                      loading="lazy"
                      className="h-28 w-full rounded-xl border border-slate-200 object-cover"
                    />
                  ))}
                </div>
              )}
              {supplier.sourceUrl && (
                <a
                  href={supplier.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
                >
                  View original source
                </a>
              )}
            </section>
          )}
          <FactoryMediaSection profile={profile} />
          <ProductsSection profile={profile} />
          <ReviewsSection profile={profile} />
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-6 py-8 sm:py-10">
            <StickyContactCard profile={profile} variant="sidebar" />
          </div>
        </aside>
      </div>

      <AiInsightsSection profile={profile} />

      {/* Trust score footnote */}
      <div className="container-page py-8 text-center text-xs text-ink-dim">
        Trust score {trust.trustScore}/100 · Profile data is generated for this MVP
        preview from public business listings and Suplymate&apos;s scoring model.
      </div>

      <StickyContactCard profile={profile} variant="mobile" />
    </div>
  );
}
