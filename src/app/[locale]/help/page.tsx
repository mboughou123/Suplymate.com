import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return completeLocalizedMetadata({
    locale,
    pathname: "/help",
    title: t("title"),
    description: t("subtitle"),
    siteName: meta("siteName"),
  });
}

const SECTIONS = [
  { titleKey: "gettingStarted", textKey: "gettingStartedText" },
  { titleKey: "supplierSearch", textKey: "supplierSearchText" },
  { titleKey: "rfqGuide", textKey: "rfqGuideText" },
  { titleKey: "priceAlertsGuide", textKey: "priceAlertsGuideText" },
] as const;

export default async function HelpPage() {
  const t = await getTranslations("help");
  const footer = await getTranslations("footer");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">{t("subtitle")}</p>

      <div className="mt-12 space-y-8">
        {SECTIONS.map((section) => (
          <section
            key={section.titleKey}
            className="rounded-2xl border border-line bg-base p-6"
          >
            <h2 className="font-display text-xl font-semibold text-ink">
              {t(section.titleKey)}
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{t(section.textKey)}</p>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">{footer("trustAndPolicies")}</h2>
        <ul className="mt-6 space-y-3 text-ink-muted">
          <li>
            <Link href="/supplier-verification-policy" className="text-cyan transition-colors hover:text-teal">
              {footer("supplierVerificationPolicy")}
            </Link>
          </li>
          <li>
            <Link href="/review-policy" className="text-cyan transition-colors hover:text-teal">
              {footer("reviewPolicy")}
            </Link>
          </li>
          <li>
            <Link href="/image-removal-policy" className="text-cyan transition-colors hover:text-teal">
              {footer("imageRemoval")}
            </Link>
          </li>
          <li>
            <Link href="/refund-and-protection-policy" className="text-cyan transition-colors hover:text-teal">
              {footer("refundAndProtection")}
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="text-cyan transition-colors hover:text-teal">
              {footer("privacy")}
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-cyan transition-colors hover:text-teal">
              {footer("terms")}
            </Link>
          </li>
          <li>
            <Link href="/cookies" className="text-cyan transition-colors hover:text-teal">
              {footer("cookies")}
            </Link>
          </li>
        </ul>
      </section>

      <p className="mt-12">
        <Link href="/contact" className="text-cyan transition-colors hover:text-teal">
          {t("contactSupport")}
        </Link>
      </p>
    </div>
  );
}
