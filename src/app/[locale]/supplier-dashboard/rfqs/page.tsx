import { getTranslations } from "next-intl/server";
import { Inbox } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { getClaimedSupplierIds } from "@/lib/supplier-access";
import SupplierRfqCard from "@/components/supplier/SupplierRfqCard";

export const dynamic = "force-dynamic";

export default async function SupplierRfqsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const t = await getTranslations("rfqs");
  const sd = await getTranslations("supplierDashboard");

  const admin = isAdminEmail(session.user.email);
  const supplierIds = await getClaimedSupplierIds(session.user.id);

  const rfqs = await prisma.rfq
    .findMany({
      where: admin
        ? { supplierId: { not: null } }
        : { supplierId: { in: supplierIds.length ? supplierIds : ["__none__"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true, quotes: { select: { id: true, status: true, publicRef: true } } },
    })
    .catch(() => []);

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
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{sd("rfqs")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("title")}</p>
      </header>

      {serialized.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Inbox className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="text-ink-muted">{t("noRfqsTitle")}</p>
        </div>
      ) : (
        <ul className="space-y-4">
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
