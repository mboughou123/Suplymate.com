import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import HomeFaqAccordion, { type HomeFaqItem } from "./HomeFaqAccordion";

/** Order matters: the first entry is open by default. */
const FAQ_KEYS = [
  "whatIs",
  "ownCountry",
  "easier",
  "aiOptional",
  "verified",
  "marketplace",
  "cost",
] as const;

/** Keys whose answer ends with a call-to-action link. */
const FAQ_LINKS: Partial<Record<(typeof FAQ_KEYS)[number], string>> = {
  cost: "/pricing",
};

export default async function HomeFaqSection() {
  const t = await getTranslations("homeFaq");

  const items: HomeFaqItem[] = FAQ_KEYS.map((key) => {
    const href = FAQ_LINKS[key];
    return {
      id: key,
      question: t(`items.${key}.question`),
      answer: t(`items.${key}.answer`),
      link: href ? { href, label: t(`items.${key}.linkLabel`) } : undefined,
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section
      id="faq"
      className="border-b border-slate-100/80 bg-base section-y-tight scroll-mt-28"
      aria-labelledby="home-faq-heading"
    >
      <script
        type="application/ld+json"
        // JSON-LD must be inlined verbatim; escape `<` so it can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2 id="home-faq-heading" className="mt-3 font-display text-display text-ink text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-md text-body-lg text-ink-muted">{t("intro")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
            <Link href="/faq" className="inline-flex items-center gap-1.5 text-cyan transition hover:gap-2.5">
              {t("allFaqs")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/contact" className="text-ink-muted transition hover:text-ink">
              {t("contact")}
            </Link>
          </div>
        </div>
        <HomeFaqAccordion items={items} />
      </div>
    </section>
  );
}
