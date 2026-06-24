import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageSupplier } from "@/lib/supplier-access";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const BUYER_ACTIONS: Record<string, string> = { accept: "accepted", decline: "declined" };
const SUPPLIER_ACTIONS: Record<string, string> = { withdraw: "withdrawn" };

// Buyer accepts/declines a quote; supplier withdraws their own. Status changes
// only ever happen server-side here.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const quote = await prisma.supplierQuote.findUnique({
    where: { id },
    include: { rfq: true },
  });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const action = String(body.action || "");

  const isBuyer = quote.rfq.buyerId === session.user.id;
  const isSupplier = await canManageSupplier(
    session.user.id,
    session.user.email,
    quote.supplierId
  );

  let newStatus: string | null = null;
  if (isBuyer && BUYER_ACTIONS[action]) newStatus = BUYER_ACTIONS[action];
  else if (isSupplier && SUPPLIER_ACTIONS[action]) newStatus = SUPPLIER_ACTIONS[action];

  if (!newStatus) {
    return NextResponse.json({ error: "Forbidden or invalid action" }, { status: 403 });
  }

  await prisma.supplierQuote.update({ where: { id }, data: { status: newStatus } });

  if (action === "accept") {
    // Mark the RFQ closed; notify the supplier-side author if present.
    await prisma.rfq.update({ where: { id: quote.rfqId }, data: { status: "closed" } });
    if (quote.createdByUserId) {
      await notify({
        userId: quote.createdByUserId,
        type: "quote",
        title: `Quote ${quote.publicRef ?? ""} accepted`.trim(),
        body: "The buyer accepted your quote. Continue in messages to arrange next steps.",
        link: "/supplier-dashboard",
      });
    }
  }

  await recordAudit({
    actorId: session.user.id,
    actor: session.user.email,
    action: `quote.${action}`,
    targetType: "QUOTE",
    targetId: id,
    detail: { rfqId: quote.rfqId },
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
