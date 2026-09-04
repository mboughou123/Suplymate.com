import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedSupplier } from "@/lib/supplier-owner";
import SupplierProfileForm from "@/components/supplier/SupplierProfileForm";

export const dynamic = "force-dynamic";

export default async function SupplierProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const t = await getTranslations("supplierDashboard");
  const profile = await getOwnedSupplier(session.user.id);
  const company = await prisma.user
    .findUnique({ where: { id: session.user.id }, select: { company: true } })
    .then((u) => u?.company ?? "")
    .catch(() => "");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{t("companyProfile")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("noProfileBody")}</p>
      </header>
      <SupplierProfileForm initial={profile} fallbackName={company} />
    </div>
  );
}
