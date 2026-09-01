import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import { getSupplierById, getFallbackSupplierIds } from "@/lib/data-service";
import { getSupplierProfile } from "@/lib/supplier-profile";
import { getPublishedSupplierMedia } from "@/lib/media-store";
import { getSupplierCertificationImages } from "@/lib/media-public";
import { listCertifications } from "@/lib/certifications-store";
import { prisma } from "@/lib/prisma";
import { normalizeMarketplaceStatus, STATUS_META } from "@/lib/verification";
import { buildPageAlternates } from "@/lib/locale-metadata";
import ClaimProfileButton from "@/components/supplier-profile/ClaimProfileButton";

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
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "supplierProfile" });
  const supplier = await getSupplierById(slug);
  if (!supplier) {
    return { title: t("supplierNotFound") };
  }
  const profile = getSupplierProfile(supplier);
  const title = t("metaTitle", {
    name: profile.base.name,
    category: profile.base.categoryLabel,
  });
  const alternates = buildPageAlternates(locale as Locale, `/supplier/${slug}`);

  return {
    title,
    description: profile.metaDescription,
    alternates,
    openGraph: {
      title,
      description: profile.metaDescription,
      url: alternates.canonical,
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
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("supplierProfile");
  const nav = await getTranslations("navigation");
  const supplier = await getSupplierById(slug);
  if (!supplier) notFound();

  // Published Media takes priority over the legacy logoUrl/imageUrl/images
  // fields; we merge them into the supplier object so the deterministic profile
  // generator (and the media section below) surface admin-curated media first.
  // Unpublished media is never fetched here.
  const pubMedia = await getPublishedSupplierMedia(supplier.id).catch(() => null);
  const mediaPhotoUrls = pubMedia
    ? [pubMedia.cover, ...pubMedia.factory, ...pubMedia.gallery].filter(Boolean).map((m) => m!.url)
    : [];
  const mediaCertImages = await getSupplierCertificationImages(supplier.id).catch(() => []);
  if (pubMedia) {
    if (pubMedia.logo) supplier.logoUrl = pubMedia.logo.url;
    if (pubMedia.cover) supplier.imageUrl = pubMedia.cover.url;
    if (mediaPhotoUrls.length) {
      supplier.supplierImages = [
        ...new Set([...mediaPhotoUrls, ...(supplier.supplierImages ?? [])]),
      ];
    }
  }

  const profile = getSupplierProfile(supplier);
  const { base, trust } = profile;
  const url = `${SITE_URL}/supplier/${slug}`;

  // Marketplace lifecycle status + claim state (DB-backed suppliers only).
  let marketplaceStatus = "LISTED";
  let claimed = false;
  let provenance: { sourceUrl: string | null; collectedAt: string | null } = {
    sourceUrl: supplier.sourceUrl ?? null,
    collectedAt: null,
  };
  try {
    const row = await prisma.supplier.findUnique({
      where: { id: supplier.id },
      select: { marketplaceStatus: true, claimedByUserId: true, sourceUrl: true, createdAt: true },
    });
    if (row) {
      marketplaceStatus = normalizeMarketplaceStatus(row.marketplaceStatus);
      claimed = !!row.claimedByUserId;
      provenance = {
        sourceUrl: row.sourceUrl ?? supplier.sourceUrl ?? null,
        collectedAt: row.createdAt ? row.createdAt.toISOString() : null,
      };
    }
  } catch {
    // fallback dataset supplier — claiming unavailable
  }
  const statusMeta = STATUS_META[normalizeMarketplaceStatus(marketplaceStatus)];
  const isDbSupplier = provenance.collectedAt !== null;

  // Real certification/media collected via import or the website scraper. Shown
  // alongside the generated profile content only when present. Published
  // certificate Media is merged ahead of the legacy image URLs.
  const realCertImages = [
    ...new Set([...mediaCertImages, ...(supplier.certificationImages ?? [])]),
  ];
  // Relational certifications with their admin-controlled verification status.
  // Never shown if rejected. A certification is NOT verified just because an
  // image exists — status is set by an admin.
  const relationalCerts = (await listCertifications(supplier.id).catch(() => []))
    .filter((c) => c.status !== "rejected");
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
      { "@type": "ListItem", position: 1, name: nav("suppliers"), item: `${SITE_URL}/suppliers` },
      { "@type": "ListItem", position: 2, name: base.name, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-base pb-20 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Breadcrumb */}
      <nav className="container-page flex items-center gap-1.5 pt-4 text-xs text-ink-dim" aria-label={t("breadcrumb")}>
        <Link href="/suppliers" className="hover:text-cyan">
          {nav("suppliers")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-ink-muted">{base.name}</span>
        {supplier.verificationStatus && (
          <VerificationBadge status={supplier.verificationStatus} size="sm" className="ml-2" />
        )}
      </nav>

      {/* Marketplace status + claim affordance */}
      <div className="container-page mt-3 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-semibold ${
            statusMeta.tone === "success"
              ? "bg-emerald-50 text-emerald-700"
              : statusMeta.tone === "danger"
                ? "bg-red-50 text-red-700"
                : statusMeta.tone === "warn"
                  ? "bg-cyan-soft text-cyan"
                  : statusMeta.tone === "info"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-600"
          }`}
          title={statusMeta.description}
        >
          {statusMeta.label}
        </span>
        <span className="text-xs text-ink-dim">{statusMeta.description}</span>
        {isDbSupplier && !claimed && (
          <span className="ml-auto">
            <ClaimProfileButton supplierId={supplier.id} supplierName={base.name} />
          </span>
        )}
      </div>

      <HeroSection profile={profile} />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="min-w-0">
          <TrustPerformanceSection profile={profile} />
          <CompanyProfileSection profile={profile} />
          <CertificationsSection profile={profile} />
          {hasRealMedia && (
            <section className="py-8 sm:py-10">
              <h2 className="font-display text-heading-lg text-ink">
                {t("collectedInfoTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {supplier.sourceUrl ? t("collectedFromWebsite") : t("collectedFromImport")}
              </p>
              {(realCertImages.length > 0 || realCertDetails.length > 0) && (
                <p className="mt-2 rounded-lg bg-cyan-soft px-3 py-2 text-xs text-cyan">
                  {t("notIndependentlyVerified")}
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
                  {t("viewOriginalSource")}
                </a>
              )}
            </section>
          )}
          {relationalCerts.length > 0 && (
            <section className="py-8 sm:py-10">
              <h2 className="font-display text-heading-lg text-ink">{t("certificationsHeading")}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {t("certificationsDisclaimer")}
              </p>
              <ul className="mt-4 space-y-2">
                {relationalCerts.map((c) => (
                  <li
                    key={c.id}
                    className="glass-card flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{c.name}</span>
                        {c.type && <span className="text-xs text-ink-dim">{c.type}</span>}
                        {c.status === "verified" ? (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            {t("suplymateVerified")}
                          </span>
                        ) : (
                          <span className="rounded-xl bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {t("verificationStatusLabel", { status: c.status })}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-dim">
                        {c.issuingOrg ? `${c.issuingOrg} ` : ""}
                        {c.certificateNumber ? `· #${c.certificateNumber} ` : ""}
                        {c.expirationDate ? `· ${t("expires", { date: c.expirationDate.slice(0, 10) })}` : ""}
                      </p>
                    </div>
                    {(c.verificationUrl || c.sourceUrl) && (
                      <a
                        href={(c.verificationUrl || c.sourceUrl) as string}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-xs font-medium text-cyan hover:underline"
                      >
                        {t("view")}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <FactoryMediaSection profile={profile} />
          <ProductsSection profile={profile} />

          {/* Source and verification (data provenance) */}
          <section className="py-8 sm:py-10">
            <h2 className="font-display text-heading-lg text-ink">{t("sourceVerificationTitle")}</h2>
            <div className="glass-card mt-3 space-y-2 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-ink-muted">{t("verificationStatus")}</span>
                <span className="font-medium text-ink">{statusMeta.label}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink-muted">{t("whatThisMeans")}</span>
                <span className="max-w-xs text-right text-ink-dim">{statusMeta.description}</span>
              </div>
              {provenance.sourceUrl && (
                <div className="flex justify-between gap-4">
                  <span className="text-ink-muted">{t("primarySource")}</span>
                  <a href={provenance.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-cyan hover:underline">
                    {t("viewSource")}
                  </a>
                </div>
              )}
              {provenance.collectedAt && (
                <div className="flex justify-between gap-4">
                  <span className="text-ink-muted">{t("listingCreated")}</span>
                  <span className="text-ink-dim">{new Date(provenance.collectedAt).toLocaleDateString()}</span>
                </div>
              )}
              <p className="border-t border-slate-100 pt-2 text-xs text-ink-dim">
                {t("provenanceDisclaimerBefore")}{" "}
                <Link href="/supplier-verification-policy" className="text-cyan hover:underline">
                  {t("verificationPolicy")}
                </Link>
                {t("provenanceDisclaimerAfter")}
              </p>
            </div>
          </section>

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
        {t("trustFootnote", { score: trust.trustScore })}
      </div>

      <StickyContactCard profile={profile} variant="mobile" />
    </div>
  );
}
