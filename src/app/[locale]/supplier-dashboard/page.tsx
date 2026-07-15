import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localeRedirect } from "@/i18n/redirect";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { getClaimedSupplierIds } from "@/lib/supplier-access";
import { Building2, Inbox } from "lucide-react";
import SupplierRfqCard from "@/components/supplier/SupplierRfqCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "navigation" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("suppliers") }),
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function SupplierDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return await localeRedirect("/login?callbackUrl=/supplier-dashboard");
  const t = await getTranslations("rfqs");
  const nav = await getTranslations("navigation");
  const empty = await getTranslations("emptyStates");

  const admin = isAdminEmail(session.user.email);
  const supplierIds = await getClaimedSupplierIds(session.user.id);

  const rfqs = await prisma.rfq.findMany({
    where: admin
      ? { supplierId: { not: null } }
      : { supplierId: { in: supplierIds.length ? supplierIds : ["__none__"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true, quotes: { select: { id: true, status: true, publicRef: true } } },
  });

  const serialized = rfqs.map((r) => ({
    id: r.id,
    publicRef: r.publicRef,
    status: r.status,
    supplierName: r.supplierName,
    destination: r.destination,
    deadline: r.deadline,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
    items: r.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit,
    })),
    quotes: r.quotes.map((q) => ({ id: q.id, status: q.status, publicRef: q.publicRef })),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Building2 className="h-6 w-6 text-cyan" aria-hidden />
        {nav("suppliers")}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{t("title")}</p>

      {!admin && supplierIds.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 py-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="text-ink-muted">{empty("noSuppliers")}</p>
          <Link href="/suppliers" className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90">
            {nav("suppliers")}
          </Link>
        </div>
      ) : serialized.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 py-16 text-center">
          <Inbox className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="text-ink-muted">{t("noRfqsTitle")}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {serialized.map((rfq) => (
            <li key={rfq.id}>
              <SupplierRfqCard rfq={rfq} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
