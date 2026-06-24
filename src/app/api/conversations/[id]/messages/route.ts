import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { detectRisk } from "@/lib/fraud";
import { autoReply } from "@/lib/auto-reply";
import { getSupplierMeta } from "@/lib/supplier-meta";
import { canManageSupplier } from "@/lib/supplier-access";
import { notify } from "@/lib/notifications";

type AttachmentInput = {
  fileName: string;
  fileType: string;
  url: string;
  sizeBytes?: number;
};

// Participant-only access: the buyer who owns the conversation OR a manager of
// the target supplier (approved claim / admin). Returns "buyer" | "supplier" |
// null along with the conversation.
async function participant(
  id: string,
  userId: string,
  email: string | null | undefined
): Promise<{ convo: Awaited<ReturnType<typeof prisma.conversation.findUnique>>; role: "buyer" | "supplier" | null }> {
  const convo = await prisma.conversation.findUnique({ where: { id } });
  if (!convo) return { convo: null, role: null };
  if (convo.buyerId === userId) return { convo, role: "buyer" };
  if (await canManageSupplier(userId, email, convo.supplierId)) return { convo, role: "supplier" };
  return { convo, role: null };
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
  const { convo, role } = await participant(id, session.user.id, session.user.email);
  if (!convo || !role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark the OTHER side's messages as read for the current viewer.
  await prisma.message.updateMany({
    where: {
      conversationId: id,
      senderType: { not: role },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  await prisma.conversation.update({
    where: { id },
    data: role === "buyer" ? { buyerLastReadAt: new Date() } : { supplierLastReadAt: new Date() },
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
      type: convo.type,
      viewerRole: role,
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
  const { convo, role } = await participant(id, session.user.id, session.user.email);
  if (!convo || !role) {
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

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderType: role, // "buyer" or "supplier" — real sender
      body: text,
      riskFlag: risk?.flag ?? null,
      readAt: new Date(),
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

  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  // Determine whether a REAL supplier account backs this profile. If so, no
  // simulated auto-reply — the supplier responds for themselves. The auto-reply
  // remains only as an honest fallback for unclaimed directory profiles.
  const supplier = await prisma.supplier
    .findUnique({ where: { id: convo.supplierId }, select: { claimedByUserId: true } })
    .catch(() => null);
  const supplierIsReal = Boolean(supplier?.claimedByUserId);

  if (role === "buyer") {
    if (supplierIsReal && supplier?.claimedByUserId) {
      // Notify the real supplier manager.
      await notify({
        userId: supplier.claimedByUserId,
        type: "message",
        title: `New message from a buyer`,
        body: "You have a new message in the supplier portal.",
        link: `/messages?c=${id}`,
      });
    } else {
      // Honest fallback for unclaimed profiles: a clearly automated acknowledgement.
      await prisma.message.create({
        data: {
          conversationId: id,
          senderType: "system",
          body: autoReply(convo.supplierName, text),
        },
      });
    }
  } else {
    // Supplier replied — notify the buyer.
    await notify({
      userId: convo.buyerId,
      type: "message",
      title: `New reply from ${convo.supplierName}`,
      body: "You have a new message in your conversation.",
      link: `/messages?c=${id}`,
    });
  }

  return NextResponse.json({ message, risk: risk ?? null });
}
