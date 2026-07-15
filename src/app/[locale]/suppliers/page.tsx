import { getTranslations } from "next-intl/server";
import { getSuppliersFromDb } from "@/lib/data-service";
import SuppliersClient from "./SuppliersClient";

export default async function SuppliersPage() {
  const t = await getTranslations("suppliers");
  const suppliers = await getSuppliersFromDb();

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
