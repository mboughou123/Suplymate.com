import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MATERIAL_CATALOG } from "@/data/material-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: "Materials" }),
    description: "Industrial materials on Suplymate — grades, uses, and Watch price signals.",
  };
}

export default function MaterialsPage() {
  return (
    <div className="bg-base pb-section pt-28 sm:pt-32">
      <div className="container-page">
        <p className="eyebrow text-cyan">Watch</p>
        <h1 className="mt-3 font-display text-display text-ink">Materials</h1>
        <p className="mt-4 max-w-2xl text-body-lg text-ink-muted">
          Catalogue materials Mate Watch tracks. Open a material to see indicative price charts.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MATERIAL_CATALOG.map((m) => (
            <li key={m.id}>
              <Link
                href={`/price-charts?m=${encodeURIComponent(m.id)}`}
                className="block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-cardHover"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan">{m.category}</p>
                <h2 className="mt-2 font-display text-heading-sm text-navy">{m.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{m.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
