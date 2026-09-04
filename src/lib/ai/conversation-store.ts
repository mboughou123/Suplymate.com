// Best-effort persistence of AI conversations. The assistant must keep working
// when the database is unavailable, so every call swallows errors.

import { prisma } from "@/lib/prisma";

export async function ensureConversation(
  userId: string,
  conversationId: string | undefined,
  firstMessage: string,
): Promise<string | null> {
  try {
    if (conversationId) {
      const existing = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });
      if (existing) return existing.id;
    }
    const created = await prisma.aiConversation.create({
      data: { userId, title: firstMessage.slice(0, 60) || "New conversation" },
      select: { id: true },
    });
    return created.id;
  } catch {
    return null;
  }
}

export async function persistTurn(
  conversationId: string | null,
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  if (!conversationId) return;
  try {
    await prisma.aiMessage.createMany({
      data: [
        { conversationId, role: "user", content: userMessage },
        { conversationId, role: "assistant", content: assistantMessage },
      ],
    });
    await prisma.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  } catch {
    /* ignore */
  }
}

export async function loadLatestConversation(userId: string): Promise<{
  conversationId: string | null;
  messages: { role: string; content: string }[];
}> {
  try {
    const convo = await prisma.aiConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
    if (!convo) return { conversationId: null, messages: [] };
    return {
      conversationId: convo.id,
      messages: convo.messages.map((m) => ({ role: m.role, content: m.content })),
    };
  } catch {
    return { conversationId: null, messages: [] };
  }
}
