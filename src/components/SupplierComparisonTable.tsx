import type { SupplierOffer } from "@/data/comparisons";

type SupplierComparisonTableProps = {
  offers: SupplierOffer[];
};

export default function SupplierComparisonTable({
  offers,
}: SupplierComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <th className="px-5 py-4 font-semibold text-ink">Supplier</th>
            <th className="px-5 py-4 font-semibold text-ink">Price</th>
            <th className="px-5 py-4 font-semibold text-ink">Shipping</th>
            <th className="px-5 py-4 font-semibold text-ink">Location</th>
            <th className="px-5 py-4 font-semibold text-ink">MOQ</th>
            <th className="px-5 py-4 font-semibold text-ink">Reliability</th>
            <th className="px-5 py-4 font-semibold text-ink">Best for</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer, i) => (
            <tr
              key={offer.supplierId}
              className={`border-b border-gray-50 transition hover:bg-mustard/15/30 ${
                i === 0 ? "bg-mustard/15/20" : ""
              }`}
            >
              <td className="px-5 py-4 font-medium text-ink">
                {offer.supplierName}
              </td>
              <td className="px-5 py-4 font-semibold text-ink">
                {offer.currency} {offer.price.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-ink-muted">{offer.shippingDays} days</td>
              <td className="px-5 py-4 text-ink-muted">{offer.location}</td>
              <td className="px-5 py-4 text-ink-muted">{offer.moq}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {offer.reliability}%
                </span>
              </td>
              <td className="px-5 py-4 text-ink-muted">{offer.bestFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
