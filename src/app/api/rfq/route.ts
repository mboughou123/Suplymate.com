import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rfqs = await prisma.rfq.findMany({
    where: { buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rfqs });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const productName = String(body.productName || "").trim();
  const quantity = String(body.quantity || "").trim();
  if (!productName || !quantity) {
    return NextResponse.json(
      { error: "Product and quantity are required" },
      { status: 400 }
    );
  }

  const conversationId = body.conversationId
    ? String(body.conversationId)
    : null;

  const rfq = await prisma.rfq.create({
    data: {
      buyerId: session.user.id,
      conversationId,
      productName,
      quantity,
      destination: body.destination ? String(body.destination) : null,
      targetPrice: body.targetPrice ? String(body.targetPrice) : null,
      deadline: body.deadline ? String(body.deadline) : null,
      details: body.details ? String(body.details) : null,
    },
  });

  // If attached to a conversation, drop the RFQ in as a buyer message.
  if (conversationId) {
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, buyerId: session.user.id },
    });
    if (convo) {
      const summary =
        `📋 Request for Quotation\n` +
        `• Product: ${productName}\n` +
        `• Quantity: ${quantity}\n` +
        (rfq.destination ? `• Destination: ${rfq.destination}\n` : "") +
        (rfq.targetPrice ? `• Target price: ${rfq.targetPrice}\n` : "") +
        (rfq.deadline ? `• Needed by: ${rfq.deadline}\n` : "") +
        (rfq.details ? `• Details: ${rfq.details}` : "");
      await prisma.message.create({
        data: { conversationId, senderType: "buyer", body: summary.trim() },
      });
      await prisma.message.create({
        data: {
          conversationId,
          senderType: "supplier",
          body: `Thank you for the RFQ on ${productName} (${quantity}). We'll prepare a formal quotation with pricing tiers, lead time, and freight within 24 hours.`,
        },
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "negotiation", lastMessageAt: new Date() },
      });
    }
  }

  return NextResponse.json({ rfq });
}
