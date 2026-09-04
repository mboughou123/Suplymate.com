import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getOwnedSupplier } from "@/lib/supplier-owner";
import SupplierProductsManager from "@/components/supplier/SupplierProductsManager";

export const dynamic = "force-dynamic";

export default async function SupplierProductsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const t = await getTranslations("supplierDashboard");
  const profile = await getOwnedSupplier(session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{t("products")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("noProductsBody")}</p>
      </header>
      <SupplierProductsManager hasProfile={Boolean(profile)} />
    </div>
  );
}
