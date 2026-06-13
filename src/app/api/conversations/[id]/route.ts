import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = [
  "inquiry",
  "negotiation",
  "sample_sent",
  "order_in_progress",
  "completed",
];

async function ownedConversation(id: string, userId: string) {
  return prisma.conversation.findFirst({ where: { id, buyerId: userId } });
}

export async function PATCH(
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
  const status = String(body.status || "");
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json({ conversation: updated });
}
