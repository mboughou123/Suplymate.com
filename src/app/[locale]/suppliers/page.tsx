import { getTranslations } from "next-intl/server";
import { getSuppliersFromDb } from "@/lib/data-service";
import ListingPageHero from "@/components/ListingPageHero";
import SuppliersClient from "./SuppliersClient";

export default async function SuppliersPage() {
  const t = await getTranslations("suppliers");
  const suppliers = await getSuppliersFromDb();

  const verifiedCount = suppliers.filter((s) => s.verified).length;
  const countryCount = new Set(
    suppliers.map((s) => s.country ?? s.location.split(",").pop()!.trim())
  ).size;

  return (
    <div className="min-h-screen bg-transparent">
      <ListingPageHero
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-glow backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            {t("badge")}
          </span>
        }
        title={t("pageTitle")}
        subtitle={t("pageSubtitle", { count: suppliers.length, countries: countryCount })}
        stats={[
          { value: suppliers.length, label: t("suppliersCount") },
          { value: verifiedCount, label: t("verifiedCount") },
          { value: countryCount, label: t("countriesCount") },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SuppliersClient initialSuppliers={suppliers} />
      </div>
    </div>
  );
}
