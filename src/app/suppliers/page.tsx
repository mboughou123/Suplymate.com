import { getSuppliersFromDb } from "@/lib/data-service";
import SuppliersClient from "./SuppliersClient";

export default async function SuppliersPage() {
  const suppliers = await getSuppliersFromDb();

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Find suppliers
          </h1>
          <p className="mt-3 max-w-2xl text-white/75">
            Who can I buy from? Browse verified suppliers by industry, location, and reliability.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SuppliersClient initialSuppliers={suppliers} />
      </div>
    </div>
  );
}
