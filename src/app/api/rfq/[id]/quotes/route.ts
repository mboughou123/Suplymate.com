import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageSupplier } from "@/lib/supplier-access";
import { computeLine, computeSubtotal, type QuoteLineInput } from "@/lib/quotes";
import { nextPublicRef } from "@/lib/refs";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// List quotes for an RFQ. Visible to the RFQ's buyer, the target supplier's
// manager, or an admin.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const rfq = await prisma.rfq.findUnique({ where: { id }, include: { items: true } });
  if (!rfq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isBuyer = rfq.buyerId === session.user.id;
  const isSupplier = rfq.supplierId
    ? await canManageSupplier(session.user.id, session.user.email, rfq.supplierId)
    : false;
  if (!isBuyer && !isSupplier) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quotes = await prisma.supplierQuote.findMany({
    where: { rfqId: id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rfq, quotes });
}

// Create a quote for an RFQ. Only the target supplier's manager or an admin may
// quote. Totals are recomputed server-side; the browser cannot set them.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const rfq = await prisma.rfq.findUnique({ where: { id }, include: { items: true } });
  if (!rfq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!rfq.supplierId) {
    return NextResponse.json({ error: "RFQ has no supplier" }, { status: 400 });
  }

  const allowed = await canManageSupplier(session.user.id, session.user.email, rfq.supplierId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const currency = String(body.currency || "USD").toUpperCase().slice(0, 3);

  // Map RFQ items to quote lines; the supplier supplies unitPrice (nullable).
  const inputLines: QuoteLineInput[] = Array.isArray(body.items) && body.items.length > 0
    ? body.items.map((l: Record<string, unknown>) => ({
        rfqItemId: l.rfqItemId ? String(l.rfqItemId) : null,
        productName: String(l.productName || "Item"),
        quantity: Number(l.quantity) || 1,
        unit: l.unit ? String(l.unit) : null,
        unitPrice:
          l.unitPrice === null || l.unitPrice === undefined || l.unitPrice === ""
            ? null
            : Number(l.unitPrice),
        note: l.note ? String(l.note) : null,
      }))
    : rfq.items.map((it) => ({
        rfqItemId: it.id,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: null,
        note: null,
      }));

  const computed = inputLines.map(computeLine);
  const subtotal = computeSubtotal(computed);

  const status = body.status === "draft" ? "draft" : "submitted";

  // Unique public reference with retry.
  let quoteId: string | null = null;
  let publicRef: string | null = null;
  for (let attempt = 0; attempt < 5 && !quoteId; attempt++) {
    const count = await prisma.supplierQuote.count({ where: { publicRef: { not: null } } });
    const candidate = nextPublicRef("QUO", count, attempt);
    try {
      const quote = await prisma.supplierQuote.create({
        data: {
          rfqId: id,
          supplierId: rfq.supplierId,
          supplierName: rfq.supplierName ?? "Supplier",
          createdByUserId: session.user.id,
          publicRef: candidate,
          status,
          currency,
          subtotal,
          leadTimeDays: body.leadTimeDays != null ? Number(body.leadTimeDays) : null,
          incoterms: body.incoterms ? String(body.incoterms) : null,
          paymentTerms: body.paymentTerms ? String(body.paymentTerms) : null,
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          shippingCostLabel: body.shippingCostLabel ? String(body.shippingCostLabel) : null,
          notes: body.notes ? String(body.notes) : null,
          items: {
            create: computed.map((l) => ({
              rfqItemId: l.rfqItemId ?? null,
              productName: l.productName,
              quantity: l.quantity,
              unit: l.unit ?? null,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
              note: l.note ?? null,
            })),
          },
        },
      });
      quoteId = quote.id;
      publicRef = quote.publicRef;
    } catch {
      if (attempt === 4) {
        return NextResponse.json({ error: "Could not generate quote reference" }, { status: 500 });
      }
    }
  }

  if (status === "submitted") {
    await prisma.rfq.update({ where: { id }, data: { status: "quoted" } });
    await notify({
      userId: rfq.buyerId,
      type: "quote",
      title: `New quote on ${rfq.publicRef ?? "your RFQ"}`,
      body: `${rfq.supplierName ?? "A supplier"} sent quote ${publicRef ?? ""}`.trim(),
      link: `/rfqs/${id}`,
    });
  }

  await recordAudit({
    actorId: session.user.id,
    actor: session.user.email,
    action: "quote.create",
    targetType: "QUOTE",
    targetId: quoteId,
    detail: { rfqId: id, publicRef, status },
  });

  return NextResponse.json({ quoteId, publicRef });
}
