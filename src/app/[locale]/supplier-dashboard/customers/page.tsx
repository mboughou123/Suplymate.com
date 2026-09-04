import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Users, ArrowUpRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { getClaimedSupplierIds } from "@/lib/supplier-access";

export const dynamic = "force-dynamic";

export default async function SupplierCustomersPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const t = await getTranslations("supplierDashboard");

  const admin = isAdminEmail(session.user.email);
  const supplierIds = await getClaimedSupplierIds(session.user.id);

  const conversations = await prisma.conversation
    .findMany({
      where: admin ? {} : { supplierId: { in: supplierIds.length ? supplierIds : ["__none__"] } },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        buyer: { select: { name: true, company: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderType: true } },
        _count: { select: { rfqs: true } },
      },
    })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{t("customers")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("noCustomersBody")}</p>
      </header>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Users className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="font-medium text-ink">{t("noCustomersTitle")}</p>
          <p className="max-w-sm text-sm text-ink-muted">{t("noCustomersBody")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-dim">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("customer")}</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">{t("messages")}</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t("rfqs")}</th>
                <th className="px-4 py-3 font-semibold">{t("lastActivity")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{c.buyer.company || c.buyer.name}</p>
                    <p className="text-xs text-ink-muted">{c.buyer.company ? c.buyer.name : c.buyer.email}</p>
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-ink-muted md:table-cell">
                    {c.messages[0]?.body ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-ink-muted sm:table-cell">{c._count.rfqs}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {c.lastMessageAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/messages?c=${c.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-cyan hover:underline"
                    >
                      {t("openConversation")}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
