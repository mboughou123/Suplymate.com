import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCart, clearCart } from "@/lib/cart-store";
import { nextPublicRef } from "@/lib/refs";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Create RFQs from the authenticated user's server cart. The cart (server-side)
// is the source of truth — the browser cannot inject arbitrary items/prices.
// One RFQ is created per supplier. Idempotency: the cart is cleared on success,
// so a repeated submit on an empty cart is a no-op (returns 400).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { destination?: string; deadline?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const cart = await getCart(userId);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }

  const destination = body.destination?.toString().trim() || null;
  const deadline = body.deadline?.toString().trim() || null;
  const note = body.note?.toString().trim() || null;

  // Group cart items by supplier.
  const bySupplier = new Map<string, typeof cart.items>();
  for (const item of cart.items) {
    const list = bySupplier.get(item.supplierId) ?? [];
    list.push(item);
    bySupplier.set(item.supplierId, list);
  }

  const createdRfqs: { id: string; publicRef: string | null; supplierName: string }[] = [];

  for (const [supplierId, items] of bySupplier) {
    const supplierName = items[0]?.supplierName ?? "Supplier";
    const totalQty = items.reduce((a, i) => a + i.quantity, 0);
    const summaryName =
      items.length === 1 ? items[0].productName : `${items.length} items`;

    // Generate a unique public reference with a few retries.
    let rfqId: string | null = null;
    let publicRef: string | null = null;
    for (let attempt = 0; attempt < 5 && !rfqId; attempt++) {
      const count = await prisma.rfq.count({ where: { publicRef: { not: null } } });
      const candidate = nextPublicRef("RFQ", count, attempt);
      try {
        const rfq = await prisma.rfq.create({
          data: {
            buyerId: userId,
            supplierId,
            supplierName,
            productName: summaryName,
            quantity: String(totalQty),
            destination,
            deadline,
            details: note,
            status: "submitted",
            publicRef: candidate,
            items: {
              create: items.map((i) => ({
                productId: i.productId,
                productName: i.productName,
                supplierId: i.supplierId,
                imageUrl: i.imageUrl,
                unit: i.unit,
                quantity: i.quantity,
                snapshotPrice: i.basePrice,
                snapshotCurrency: i.currency,
              })),
            },
          },
        });
        rfqId = rfq.id;
        publicRef = rfq.publicRef;
      } catch {
        // Unique collision on publicRef — retry with next sequence.
        if (attempt === 4) {
          return NextResponse.json(
            { error: "Could not generate RFQ reference, please retry" },
            { status: 500 }
          );
        }
      }
    }

    if (!rfqId) continue;

    // Attach to (or create) a conversation with this supplier and post a message.
    let conversation = await prisma.conversation.findFirst({
      where: { buyerId: userId, supplierId },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: userId,
          supplierId,
          supplierName,
          type: "RFQ",
          subject: `RFQ ${publicRef ?? ""}`.trim(),
        },
      });
    }
    const lines = items
      .map((i) => `• ${i.productName} — qty ${i.quantity}${i.unit ? ` ${i.unit}` : ""}`)
      .join("\n");
    const summary =
      `Request for Quotation ${publicRef ?? ""}\n` +
      `${lines}\n` +
      (destination ? `Destination: ${destination}\n` : "") +
      (deadline ? `Needed by: ${deadline}\n` : "") +
      (note ? `Notes: ${note}` : "");
    await prisma.message.create({
      data: { conversationId: conversation.id, senderType: "buyer", body: summary.trim() },
    });
    await prisma.rfq.update({ where: { id: rfqId }, data: { conversationId: conversation.id } });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: "inquiry", type: "RFQ" },
    });

    createdRfqs.push({ id: rfqId, publicRef, supplierName });
    await recordAudit({
      actorId: userId,
      actor: session.user.email,
      action: "rfq.create",
      targetType: "RFQ",
      targetId: rfqId,
      detail: { publicRef, supplierId, items: items.length },
    });
  }

  await notify({
    userId,
    type: "rfq",
    title: `${createdRfqs.length} RFQ${createdRfqs.length === 1 ? "" : "s"} submitted`,
    body: createdRfqs.map((r) => r.publicRef ?? r.supplierName).join(", "),
    link: "/rfqs",
  });

  await clearCart(userId);

  return NextResponse.json({ rfqs: createdRfqs });
}
