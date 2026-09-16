"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SteelMetalLeaf } from "@/data/taxonomy/steel-metal";
import {
  LEAF_FACET_KEYS,
  buildRfqProductName,
  facetGroupsForLeaf,
  parseLeafFacetQuery,
  serializeLeafFacetQuery,
  type LeafFacetKey,
  type LeafFacetSelection,
} from "@/lib/steel-metal-listings";
import SteelMetalRfqForm from "./SteelMetalRfqForm";

const FACET_LABEL: Record<LeafFacetKey, "facetForm" | "facetGrade" | "facetThickness" | "facetFinish" | "facetStandard"> =
  {
    form: "facetForm",
    grade: "facetGrade",
    thickness: "facetThickness",
    finish: "facetFinish",
    standard: "facetStandard",
  };

type Props = {
  leaf: SteelMetalLeaf;
  initialQuery: Record<string, string>;
};

function facetLabel(selection: LeafFacetSelection, key: LeafFacetKey): string | undefined {
  return selection[key];
}

export default function LeafVariantExplorer({ leaf, initialQuery }: Props) {
  const t = useTranslations("steelMetal");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groups = useMemo(() => facetGroupsForLeaf(leaf), [leaf]);
  const selection = useMemo(() => {
    const fromUrl: Record<string, string> = {};
    for (const key of LEAF_FACET_KEYS) {
      const value = searchParams.get(key);
      if (value) fromUrl[key] = value;
    }
    return parseLeafFacetQuery(Object.keys(fromUrl).length ? fromUrl : initialQuery);
  }, [initialQuery, searchParams]);

  const replaceSelection = useCallback(
    (next: LeafFacetSelection) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(serializeLeafFacetQuery(next))) {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  function toggle(key: LeafFacetKey, option: string) {
    const next = { ...selection };
    if (next[key] === option) delete next[key];
    else next[key] = option;
    replaceSelection(next);
  }

  const productName = buildRfqProductName(leaf, selection);
  const selectedLine = [
    facetLabel(selection, "grade"),
    facetLabel(selection, "form"),
    facetLabel(selection, "thickness"),
    facetLabel(selection, "finish"),
    facetLabel(selection, "standard"),
  ]
    .filter(Boolean)
    .join(" · ");

  const details = [
    `Material type: ${leaf.name}`,
    selectedLine ? `Specification: ${selectedLine}` : null,
    leaf.common_names.length ? `Also known as: ${leaf.common_names.join(", ")}` : null,
    "Please quote unit price, MOQ, lead time, mill/origin and packing. No assumed FOB.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-8">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-heading-sm text-ink">{t(FACET_LABEL[group.key])}</h2>
              {selection[group.key] && (
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...selection };
                    delete next[group.key];
                    replaceSelection(next);
                  }}
                  className="cursor-pointer text-xs font-semibold text-cyan transition-colors duration-200 hover:text-navy"
                >
                  {t("clearFacet")}
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.options.map((option) => {
                const active = selection[group.key] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggle(group.key, option)}
                    aria-pressed={active}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-left text-sm transition-colors duration-200 ${
                      active
                        ? "border-navy bg-navy text-white"
                        : "border-slate-200 bg-white text-ink-muted hover:border-cyan/40 hover:text-ink"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {leaf.variants.other_specs.length > 0 && (
          <section>
            <h2 className="font-display text-heading-sm text-ink">{t("otherSpecs")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {leaf.variants.other_specs.map((spec) => (
                <li
                  key={spec}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-ink-muted"
                >
                  {spec}
                </li>
              ))}
            </ul>
          </section>
        )}

        {leaf.buyer_search_examples.length > 0 && (
          <section>
            <h2 className="font-display text-heading-sm text-ink">{t("buyerSearches")}</h2>
            <ul className="mt-3 space-y-2">
              {leaf.buyer_search_examples.map((example) => (
                <li
                  key={example}
                  className="border-l-2 border-cyan/40 pl-3 text-sm text-ink-muted"
                >
                  {example}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="lg:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">{t("rfqTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("rfqBody")}</p>
          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
              {t("selectedSpec")}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {selectedLine || t("noFacetSelected")}
            </p>
          </div>
          <div className="mt-5">
            <SteelMetalRfqForm productName={productName} details={details} />
          </div>
        </div>
      </aside>
    </div>
  );
}
