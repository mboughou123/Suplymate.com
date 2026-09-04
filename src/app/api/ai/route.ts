import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isOpenAiConfigured } from "@/lib/openai";
import { runAssistant, MAX_MESSAGE_LENGTH, MAX_HISTORY_MESSAGES } from "@/lib/ai/aiService";
import { ensureConversation, loadLatestConversation, persistTurn } from "@/lib/ai/conversation-store";
import { pricingStatus } from "@/lib/pricing/pricingService";

export const dynamic = "force-dynamic";

type HistoryItem = { role: "user" | "assistant"; content: string };

function sanitizeHistory(input: unknown): HistoryItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is HistoryItem =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

// GET: workspace bootstrap — engine status + the user's latest conversation.
export async function GET() {
  const session = await auth();
  const base = {
    engine: isOpenAiConfigured() ? "openai" : "demo",
    pricing: pricingStatus(),
    authenticated: Boolean(session?.user?.id),
  };
  if (!session?.user?.id) return NextResponse.json({ ...base, conversationId: null, messages: [] });
  const convo = await loadLatestConversation(session.user.id);
  return NextResponse.json({ ...base, ...convo });
}

// POST: one assistant turn. Returns structured JSON (narrative + grounded blocks).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to use the AI assistant." }, { status: 401 });
  }
  const userId = session.user.id;

  const limit = rateLimit(`ai:${userId}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `You're sending messages too quickly. Please wait ${limit.resetInSeconds}s and try again.` },
      { status: 429 },
    );
  }

  let body: { message?: unknown; history?: unknown; conversationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      { status: 400 },
    );
  }

  const history = sanitizeHistory(body.history);
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  const threadId = await ensureConversation(userId, conversationId, message);

  try {
    const result = await runAssistant({ message, history });
    await persistTurn(threadId, message, result.reply);
    return NextResponse.json({ ...result, conversationId: threadId });
  } catch {
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again in a moment." },
      { status: 503 },
    );
  }
}
