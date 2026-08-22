import { Check } from "lucide-react";
import type { DescriptionSection } from "@/lib/product-detail";

function SpecTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? "bg-base/60" : "bg-surface"}>
              <th className="w-2/5 border-b border-line px-4 py-2.5 text-left font-semibold text-ink">
                {row.label}
              </th>
              <td className="border-b border-line px-4 py-2.5 text-ink-muted">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The highlight tiles that sat above these sections asserted a manufacturing
// standard ("Produced under ISO 9001 with full documentation"), Incoterms and a
// lead time, all picked from a pool per product.
export default function ProductDescription({
  sections,
}: {
  sections: DescriptionSection[];
}) {
  return (
    <div className="space-y-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">
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
  );
}
