import { getTranslations } from "next-intl/server";
import { getSuppliersFromDb } from "@/lib/data-service";
import ListingPageHeader from "@/components/listing/ListingPageHeader";
import SuppliersClient from "./SuppliersClient";

export default async function SuppliersPage() {
  const t = await getTranslations("suppliers");
  const suppliers = await getSuppliersFromDb();

  const verifiedCount = suppliers.filter((s) => s.verified).length;
  const countryCount = new Set(
    suppliers.map((s) => s.country ?? s.location.split(",").pop()!.trim())
  ).size;

  return (
    <div className="min-h-screen bg-base">
      <ListingPageHeader
        eyebrow={t("badge")}
        title={t("pageTitle")}
        subtitle={t("pageSubtitle", { count: suppliers.length, countries: countryCount })}
        stats={[
          { value: suppliers.length, label: t("suppliersCount") },
          { value: verifiedCount, label: t("verifiedCount") },
          { value: countryCount, label: t("countriesCount") },
        ]}
      />

      <div className="container-page py-10 sm:py-12">
        <SuppliersClient initialSuppliers={suppliers} />
      </div>
    </div>
  );
}
