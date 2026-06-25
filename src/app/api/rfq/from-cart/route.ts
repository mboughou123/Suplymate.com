import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCart, removeItemsForSuppliers } from "@/lib/cart-store";
import { nextPublicRef } from "@/lib/refs";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type CreatedRfq = { id: string; publicRef: string | null; supplierName: string; supplierId: string };
type FailedRfq = { supplierId: string; supplierName: string; error: string };

async function createRfqForSupplier(opts: {
  userId: string;
  userEmail: string | null | undefined;
  supplierId: string;
  supplierName: string;
  items: Awaited<ReturnType<typeof getCart>>["items"];
  destination: string | null;
  deadline: string | null;
  note: string | null;
}): Promise<CreatedRfq> {
  const { userId, userEmail, supplierId, supplierName, items, destination, deadline, note } = opts;
  const totalQty = items.reduce((a, i) => a + i.quantity, 0);
  const summaryName = items.length === 1 ? items[0].productName : `${items.length} items`;

  let rfqId: string | null = null;
  let publicRef: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
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
      break;
    } catch {
      if (attempt === 4) throw new Error("Could not generate RFQ reference");
    }
  }
  if (!rfqId) throw new Error("RFQ creation failed");

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

  await recordAudit({
    actorId: userId,
    actor: userEmail,
    action: "rfq.create",
    targetType: "RFQ",
    targetId: rfqId,
    detail: { publicRef, supplierId, items: items.length },
  });

  return { id: rfqId, publicRef, supplierName, supplierId };
}

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

  const bySupplier = new Map<string, typeof cart.items>();
  for (const item of cart.items) {
    const list = bySupplier.get(item.supplierId) ?? [];
    list.push(item);
    bySupplier.set(item.supplierId, list);
  }

  const created: CreatedRfq[] = [];
  const failed: FailedRfq[] = [];

  for (const [supplierId, items] of bySupplier) {
    const supplierName = items[0]?.supplierName ?? "Supplier";
    try {
      const rfq = await createRfqForSupplier({
        userId,
        userEmail: session.user.email,
        supplierId,
        supplierName,
        items,
        destination,
        deadline,
        note,
      });
      created.push(rfq);
    } catch (e) {
      failed.push({
        supplierId,
        supplierName,
        error: e instanceof Error ? e.message : "Failed to create RFQ",
      });
    }
  }

  if (created.length > 0) {
    await removeItemsForSuppliers(
      userId,
      created.map((r) => r.supplierId)
    );
    await notify({
      userId,
      type: "rfq",
      title: `${created.length} RFQ${created.length === 1 ? "" : "s"} submitted`,
      body: created.map((r) => r.publicRef ?? r.supplierName).join(", "),
      link: "/rfqs",
    });
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: "No RFQs could be created", failed },
      { status: 500 }
    );
  }

  return NextResponse.json({
    rfqs: created,
    failed,
    partial: failed.length > 0,
  });
}
