import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { detectRisk } from "@/lib/fraud";
import { autoReply } from "@/lib/auto-reply";
import { getSupplierMeta } from "@/lib/supplier-meta";

type AttachmentInput = {
  fileName: string;
  fileType: string;
  url: string;
  sizeBytes?: number;
};

async function ownedConversation(id: string, userId: string) {
  return prisma.conversation.findFirst({ where: { id, buyerId: userId } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const convo = await ownedConversation(id, session.user.id);
  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark supplier/system messages as read (read receipts for the buyer view).
  await prisma.message.updateMany({
    where: { conversationId: id, senderType: { not: "buyer" }, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    include: { attachments: true },
  });

  return NextResponse.json({
    conversation: {
      id: convo.id,
      supplierId: convo.supplierId,
      supplierName: convo.supplierName,
      status: convo.status,
    },
    supplierMeta: getSupplierMeta(convo.supplierId),
    messages,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const convo = await ownedConversation(id, session.user.id);
  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const text = String(body.body || "").trim();
  const attachments: AttachmentInput[] = Array.isArray(body.attachments)
    ? body.attachments.slice(0, 8)
    : [];

  if (!text && attachments.length === 0) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const risk = detectRisk(text);

  const buyerMessage = await prisma.message.create({
    data: {
      conversationId: id,
      senderType: "buyer",
      body: text,
      riskFlag: risk?.flag ?? null,
      attachments: {
        create: attachments.map((a) => ({
          fileName: String(a.fileName).slice(0, 200),
          fileType: String(a.fileType || "other"),
          url: String(a.url || ""),
          sizeBytes: Number(a.sizeBytes) || 0,
        })),
      },
    },
    include: { attachments: true },
  });

  // Supplier "reads" the buyer message, then auto-replies.
  await prisma.message.update({
    where: { id: buyerMessage.id },
    data: { readAt: new Date() },
  });

  await prisma.message.create({
    data: {
      conversationId: id,
      senderType: "supplier",
      body: autoReply(convo.supplierName, text),
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: "message",
      title: `New reply from ${convo.supplierName}`,
      body: "You have a new message in your conversation.",
      link: `/messages?c=${id}`,
    },
  });

  return NextResponse.json({
    message: buyerMessage,
    risk: risk ?? null,
  });
}
