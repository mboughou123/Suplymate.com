import { getTranslations, setRequestLocale } from "next-intl/server";
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
    title: t("contactTitle"),
    description: t("contactDescription"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const footer = await getTranslations("footer");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
          {t("emailLabel")}
        </p>
        <a
          href={`mailto:${t("email")}`}
          className="mt-3 inline-block font-display text-2xl font-semibold text-cyan transition-colors hover:text-teal"
        >
          {t("email")}
        </a>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("responseNote")}</p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("whatToIncludeTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("whatToIncludeIntro")}</p>
        <ul className="mt-6 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>{t("includeAccountEmail")}</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>{t("includeSupplierLink")}</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>{t("includeScreenshots")}</span>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <ul className="space-y-3 text-ink-muted">
          <li>
            <Link href="/help" className="text-cyan transition-colors hover:text-teal">
              {footer("help")}
            </Link>
            {" · "}
            <Link href="/faq" className="text-cyan transition-colors hover:text-teal">
              {footer("faq")}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
