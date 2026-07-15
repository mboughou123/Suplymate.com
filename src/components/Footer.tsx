"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const linkClass = "transition-colors hover:text-cyan";

export default function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("navigation");

  return (
    <footer className="relative border-t border-slate-200 bg-slate-50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="font-display text-lg font-bold text-ink">
              {nav("brandSuply")}
              <span className="gradient-text">{nav("brandMate")}</span>
            </p>
            <p className="mt-3 text-sm text-ink-muted leading-relaxed">
              {t("tagline")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              {t("platform")}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/suppliers" className={linkClass}>{nav("suppliers")}</Link></li>
              <li><Link href="/products" className={linkClass}>{nav("products")}</Link></li>
              <li><Link href="/price-charts" className={linkClass}>{nav("priceCharts")}</Link></li>
              <li><Link href="/ai-assistant" className={linkClass}>{nav("aiAssistant")}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              {t("company")}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/pricing" className={linkClass}>{nav("pricing")}</Link></li>
              <li><Link href="/about" className={linkClass}>{t("about")}</Link></li>
              <li><Link href="/contact" className={linkClass}>{t("contact")}</Link></li>
              <li><Link href="/help" className={linkClass}>{t("help")}</Link></li>
              <li><Link href="/faq" className={linkClass}>{t("faq")}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              {t("legal")}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/privacy" className={linkClass}>{t("privacy")}</Link></li>
              <li><Link href="/terms" className={linkClass}>{t("terms")}</Link></li>
              <li><Link href="/cookies" className={linkClass}>{t("cookies")}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              {t("trustAndPolicies")}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              <li><Link href="/supplier-verification-policy" className={linkClass}>{t("supplierVerificationPolicy")}</Link></li>
              <li><Link href="/review-policy" className={linkClass}>{t("reviewPolicy")}</Link></li>
              <li><Link href="/image-removal-policy" className={linkClass}>{t("imageRemoval")}</Link></li>
              <li><Link href="/refund-and-protection-policy" className={linkClass}>{t("refundAndProtection")}</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-slate-200 pt-8 text-center text-xs text-ink-dim">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
