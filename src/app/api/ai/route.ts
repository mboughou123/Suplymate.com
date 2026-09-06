import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { runAssistant, engineStatus, MAX_MESSAGE_LENGTH, MAX_HISTORY_MESSAGES } from "@/lib/ai/aiService";
import { ensureConversation, loadLatestConversation, persistTurn } from "@/lib/ai/conversation-store";
import { pricingStatus } from "@/lib/pricing/pricingService";

export const dynamic = "force-dynamic";
// Vercel function timeout. The OpenAI call itself aborts after 40s (see
// src/lib/openai.ts) so a slow model never turns into an opaque 504.
export const maxDuration = 60;

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
    ...engineStatus(),
    pricing: pricingStatus(),
    authenticated: Boolean(session?.user?.id),
  };
  if (!session?.user?.id) return NextResponse.json({ ...base, conversationId: null, messages: [] });
  const convo = await loadLatestConversation(session.user.id);
  return NextResponse.json({ ...base, ...convo });
}

/** Free questions a signed-out visitor may ask per IP per day. */
const GUEST_QUESTION_LIMIT = 3;
const GUEST_WINDOW_MS = 24 * 60 * 60_000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

// POST: one assistant turn. Returns structured JSON (narrative + grounded blocks).
// Signed-out visitors get a small daily allowance so the public /ai-assistant
// page actually answers; their turns are not persisted.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  let guestRemaining: number | null = null;

  if (userId) {
    const limit = rateLimit(`ai:${userId}`, 20, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `You're sending messages too quickly. Please wait ${limit.resetInSeconds}s and try again.` },
        { status: 429 },
      );
    }
  } else {
    const guest = rateLimit(`ai-guest:${clientIp(request)}`, GUEST_QUESTION_LIMIT, GUEST_WINDOW_MS);
    if (!guest.ok) {
      return NextResponse.json(
        {
          error: `You've used your ${GUEST_QUESTION_LIMIT} free questions — sign in to keep asking Mate.`,
          code: "guest_limit",
          guest: true,
          guestRemaining: 0,
        },
        { status: 401 },
      );
    }
    guestRemaining = guest.remaining;
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
  const threadId = userId ? await ensureConversation(userId, conversationId, message) : null;

  try {
    const result = await runAssistant({ message, history });
    if (userId) {
      await persistTurn(threadId, message, result.reply);
      return NextResponse.json({ ...result, conversationId: threadId, guest: false });
    }
    return NextResponse.json({ ...result, conversationId: null, guest: true, guestRemaining });
  } catch (err) {
    console.error("[api/ai] assistant turn failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again in a moment." },
      { status: 503 },
    );
  }
}
