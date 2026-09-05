import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSuppliersFromDb } from "@/lib/data-service";
import type { Supplier } from "@/data/suppliers";
import SuppliersClient from "./SuppliersClient";

// Static + ISR: the directory is read-mostly (admin approvals land within the
// revalidation window) and the full list is filtered client-side anyway.
export const revalidate = 300;

// The listing client only needs a subset of each supplier: filters, sorting and
// the card. Drop the heavy profile-only fields (opening hours, address,
// certification payloads, full photo galleries) so the RSC payload shipped to
// the browser stays small. `supplierImages` is reduced to a single entry
// because the client only checks whether ANY image exists.
const PROFILE_ONLY_FIELDS: ReadonlyArray<keyof Supplier> = [
  "openingHours",
  "address",
  "lastUpdated",
  "certificationImages",
  "certificationsDetailed",
];

function toListingSupplier(s: Supplier): Supplier {
  const out: Supplier = { ...s };
  for (const key of PROFILE_ONLY_FIELDS) delete out[key];
  if (out.supplierImages && out.supplierImages.length > 1) {
    out.supplierImages = out.supplierImages.slice(0, 1);
  }
  return out;
}

export default async function SuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, allSuppliers] = await Promise.all([
    getTranslations("suppliers"),
    getSuppliersFromDb(),
  ]);
  const suppliers = allSuppliers.map(toListingSupplier);

  const verifiedCount = suppliers.filter((s) => s.verified).length;
  const countryCount = new Set(
    suppliers.map((s) => s.country ?? s.location.split(",").pop()!.trim())
  ).size;

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-glow">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t("badge")}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            {t("pageTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-white/75">
            {t("pageSubtitle", { count: suppliers.length, countries: countryCount })}
          </p>
          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-white">{suppliers.length}</p>
              <p className="text-white/60">{t("suppliersCount")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{verifiedCount}</p>
              <p className="text-white/60">{t("verifiedCount")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{countryCount}</p>
              <p className="text-white/60">{t("countriesCount")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SuppliersClient initialSuppliers={suppliers} />
      </div>
    </div>
  );
}
