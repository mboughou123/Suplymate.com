import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("faqTitle"),
    description: t("faqDescription"),
  };
}

const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export default async function FaqPage() {
  const t = await getTranslations("faq");
  const footer = await getTranslations("footer");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">{t("intro")}</p>
      <p className="mt-2 text-ink-muted">
        <Link href="/help" className="text-cyan transition-colors hover:text-teal">
          {t("helpCenter")}
        </Link>
        {" · "}
        <Link href="/contact" className="text-cyan transition-colors hover:text-teal">
          {footer("contact")}
        </Link>
      </p>

      <div className="mt-12 space-y-4">
        {FAQ_KEYS.map((n) => (
          <details
            key={n}
            className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors open:border-cyan/40"
          >
            <summary className="flex cursor-pointer items-center justify-between font-display text-lg font-semibold text-ink marker:content-['']">
              {t(`q${n}`)}
              <span className="ml-4 text-cyan transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-4 leading-relaxed text-ink-muted">{t(`a${n}`)}</p>
          </details>
        ))}
      </div>

      <p className="mt-12 text-sm leading-relaxed text-ink-dim">
        <Link href="/supplier-verification-policy" className="text-cyan transition-colors hover:text-teal">
          {footer("supplierVerificationPolicy")}
        </Link>
        {" · "}
        <Link href="/review-policy" className="text-cyan transition-colors hover:text-teal">
          {footer("reviewPolicy")}
        </Link>
        {" · "}
        <Link href="/refund-and-protection-policy" className="text-cyan transition-colors hover:text-teal">
          {footer("refundAndProtection")}
        </Link>
      </p>
    </div>
  );
}
