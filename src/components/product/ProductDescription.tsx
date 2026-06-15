import { Check } from "lucide-react";
import type { DescriptionSection, ProductHighlight } from "@/lib/product-detail";
import { PRODUCT_ICONS } from "@/components/product/productIcons";

function SpecTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white"}>
              <th className="w-2/5 border-b border-slate-100 px-4 py-2.5 text-left font-semibold text-ink">
                {row.label}
              </th>
              <td className="border-b border-slate-100 px-4 py-2.5 text-ink-muted">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductDescription({
  sections,
  highlights,
}: {
  sections: DescriptionSection[];
  highlights: ProductHighlight[];
}) {
  return (
    <div className="space-y-8">
      {/* Highlights */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((h) => {
          const Icon = PRODUCT_ICONS[h.icon];
          return (
            <div
              key={h.title}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">{h.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{h.text}</p>
            </div>
          );
        })}
      </div>

      {/* Description sections */}
      <div className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan to-teal" />
              {section.title}
            </h3>
            {section.body && (
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{section.body}</p>
            )}
            {section.bullets && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {section.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-ink-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {section.table && (
              <div className="mt-3">
                <SpecTable rows={section.table} />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
