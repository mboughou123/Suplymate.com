import { getMaterialsFromDb } from "@/lib/data-service";
import PriceChartsClient from "./PriceChartsClient";

export default async function PriceChartsPage() {
  const materials = await getMaterialsFromDb();

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl text-balance">
            Track material prices and buy at the right time
          </h1>
          <p className="mt-3 max-w-2xl text-white/75">
            When should I buy? Monitor commodities with AI signals: Buy now, Wait, or Monitor.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PriceChartsClient initialMaterials={materials} />
      </div>
    </div>
  );
}
