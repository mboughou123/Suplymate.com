import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { firstContactReply } from "@/lib/auto-reply";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { buyerId: session.user.id },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const data = conversations.map((c) => {
    const last = c.messages[0];
    return {
      id: c.id,
      supplierId: c.supplierId,
      supplierName: c.supplierName,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      lastMessage: last
        ? { senderType: last.senderType, body: last.body, createdAt: last.createdAt }
        : null,
    };
  });

  return NextResponse.json({ conversations: data });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supplierId = String(body.supplierId || "").trim();
    const supplierName = String(body.supplierName || "").trim();
    if (!supplierId || !supplierName) {
      return NextResponse.json({ error: "Missing supplier" }, { status: 400 });
    }

    // Optional product / RFQ context (from a "Request Quote" action).
    const productName = String(body.productName || "").trim();
    const productId = String(body.productId || "").trim();
    const quantity = String(body.quantity || "").trim();
    const buyerMessage = String(body.message || "").trim();

    // Re-open existing conversation if one already exists for this pair.
    let conversation = await prisma.conversation.findFirst({
      where: { buyerId: session.user.id, supplierId },
    });
    const created = !conversation;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: session.user.id,
          supplierId,
          supplierName,
          messages: {
            create: {
              senderType: "supplier",
              body: firstContactReply(supplierName),
              readAt: new Date(),
            },
          },
        },
      });
    }

    // When the buyer sent a quote request, persist it as a real buyer message
    // and a structured RFQ so it flows through the existing messaging system.
    if (buyerMessage || productName) {
      const text =
        buyerMessage ||
        `Hi, I'd like a quote for ${productName}${quantity ? ` (qty: ${quantity})` : ""}.`;
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "buyer",
          body: text,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), status: "inquiry" },
      });
      if (productName) {
        await prisma.rfq.create({
          data: {
            conversationId: conversation.id,
            buyerId: session.user.id,
            productName,
            quantity: quantity || "TBD",
            details: productId ? `Product ref: ${productId}` : null,
          },
        });
      }
    }

    return NextResponse.json({ conversation, created });
  } catch {
    return NextResponse.json(
      { error: "Failed to start conversation" },
      { status: 500 }
    );
  }
}
