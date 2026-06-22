import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isOpenAiConfigured, type ChatMessage } from "@/lib/openai";
import {
  demoReply,
  getAiReply,
  streamAiReply,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
} from "@/lib/ai-assistant";

export const dynamic = "force-dynamic";

type HistoryItem = { role: "user" | "assistant"; content: string };

function sanitizeHistory(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is HistoryItem =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

// Ensure the conversation belongs to this user (or create a fresh one).
// Best-effort: returns null if the DB is unavailable so chat still works.
async function ensureConversation(
  userId: string,
  conversationId: string | undefined,
  firstMessage: string
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
      data: {
        userId,
        title: firstMessage.slice(0, 60) || "New conversation",
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    return null;
  }
}

async function persistMessages(
  conversationId: string | null,
  userId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  if (!conversationId) return;
  try {
    await prisma.aiMessage.createMany({
      data: [
        { conversationId, role: "user", content: userMessage },
        { conversationId, role: "assistant", content: assistantMessage },
      ],
    });
    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  } catch {
    /* best-effort persistence; ignore DB errors */
  }
}

// GET: load the user's most recent AI conversation (preserve history).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const convo = await prisma.aiConversation.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
    if (!convo) return NextResponse.json({ conversationId: null, messages: [] });
    return NextResponse.json({
      conversationId: convo.id,
      messages: convo.messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch {
    return NextResponse.json({ conversationId: null, messages: [] });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please sign in to use the AI assistant." },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  // App-level rate limiting (per user): 20 messages / minute.
  const limit = rateLimit(`ai-chat:${userId}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `You're sending messages too quickly. Please wait ${limit.resetInSeconds}s and try again.`,
      },
      { status: 429 }
    );
  }

  let body: { message?: unknown; history?: unknown; conversationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const history = sanitizeHistory(body.history);
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : undefined;
  const threadId = await ensureConversation(userId, conversationId, message);

  // No OpenAI key → return the honest demo reply as JSON (no streaming).
  if (!isOpenAiConfigured()) {
    const reply = demoReply(message);
    await persistMessages(threadId, userId, message, reply);
    return NextResponse.json(
      { reply, source: "demo", conversationId: threadId },
      { headers: { "x-ai-source": "demo" } }
    );
  }

  // Stream the OpenAI response as plain-text chunks.
  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const gen = await streamAiReply({ message, history });
        for await (const delta of gen) {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        }
      } catch {
        // OpenAI failed mid/before stream → degrade to a safe template reply.
        if (!full) {
          try {
            const fallback = await getAiReply({ message, history });
            full = fallback.reply;
            controller.enqueue(encoder.encode(full));
          } catch {
            full =
              "Sorry — the AI service is temporarily unavailable. Please try again in a moment.";
            controller.enqueue(encoder.encode(full));
          }
        }
      } finally {
        controller.close();
        await persistMessages(threadId, userId, message, full);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-ai-source": "openai",
      ...(threadId ? { "x-conversation-id": threadId } : {}),
    },
  });
}
