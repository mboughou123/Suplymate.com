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

    // Re-open existing conversation if one already exists for this pair.
    const existing = await prisma.conversation.findFirst({
      where: { buyerId: session.user.id, supplierId },
    });
    if (existing) {
      return NextResponse.json({ conversation: existing, created: false });
    }

    const conversation = await prisma.conversation.create({
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

    return NextResponse.json({ conversation, created: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to start conversation" },
      { status: 500 }
    );
  }
}
