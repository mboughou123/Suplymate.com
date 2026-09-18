import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { runAssistant, engineStatus, MAX_MESSAGE_LENGTH, MAX_HISTORY_MESSAGES } from "@/lib/ai/aiService";
import { ensureConversation, loadLatestConversation, persistTurn } from "@/lib/ai/conversation-store";
import { pricingStatus } from "@/lib/pricing/pricingService";
import { AI_USAGE_WINDOW_MS, FREE_AI_RUNS, usesLiveAi } from "@/lib/permissions";
import { AI_QUOTA, entitlementsForUserId } from "@/lib/plan-access";

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

const GUEST_WINDOW_MS = 24 * 60 * 60_000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

// GET: workspace bootstrap — engine status + the user's latest conversation.
export async function GET() {
  const session = await auth();
  const entitlements = await entitlementsForUserId(session?.user?.id);
  const base = {
    ...engineStatus(),
    pricing: pricingStatus(),
    authenticated: Boolean(session?.user?.id),
    aiMode: entitlements.aiMode,
    aiRunsLimit: entitlements.aiRunsLimit,
  };
  if (!session?.user?.id) return NextResponse.json({ ...base, conversationId: null, messages: [] });
  const convo = await loadLatestConversation(session.user.id);
  return NextResponse.json({ ...base, ...convo });
}

// POST: one assistant turn. Returns structured JSON (narrative + grounded blocks).
// Demo plans (Free / Basic / paid trial) never spend OpenAI credit.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const entitlements = await entitlementsForUserId(userId);
  const demo = !usesLiveAi(entitlements);
  let quotaRemaining: number | null = null;

  if (userId) {
    const abuse = rateLimit(`ai:${userId}`, 20, 60_000);
    if (!abuse.ok) {
      return NextResponse.json(
        { error: `You're sending messages too quickly. Please wait ${abuse.resetInSeconds}s and try again.` },
        { status: 429 },
      );
    }
    if (entitlements.aiRunsLimit != null) {
      const quota = rateLimit(`ai-quota:${userId}`, entitlements.aiRunsLimit, AI_USAGE_WINDOW_MS);
      if (!quota.ok) {
        return NextResponse.json(
          {
            error:
              entitlements.plan === "basic"
                ? "You've used your Basic demo Mate run. Upgrade to Premium for 10 live runs."
                : `You've used your ${entitlements.aiRunsLimit} Mate questions on this plan. Upgrade to keep asking.`,
            code: AI_QUOTA,
            aiMode: entitlements.aiMode,
            quotaRemaining: 0,
          },
          { status: 403 },
        );
      }
      quotaRemaining = quota.remaining;
    }
  } else {
    const guest = rateLimit(`ai-guest:${clientIp(request)}`, FREE_AI_RUNS, GUEST_WINDOW_MS);
    if (!guest.ok) {
      return NextResponse.json(
        {
          error: `You've used your ${FREE_AI_RUNS} free questions — start a 3-day trial to keep asking Mate.`,
          code: "guest_limit",
          guest: true,
          guestRemaining: 0,
          aiMode: "demo",
        },
        { status: 401 },
      );
    }
    quotaRemaining = guest.remaining;
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
    const result = await runAssistant({ message, history, mode: demo ? "demo" : "live" });
    if (userId) {
      await persistTurn(threadId, message, result.reply);
      return NextResponse.json({
        ...result,
        conversationId: threadId,
        guest: false,
        aiMode: entitlements.aiMode,
        quotaRemaining,
      });
    }
    return NextResponse.json({
      ...result,
      conversationId: null,
      guest: true,
      guestRemaining: quotaRemaining,
      aiMode: "demo",
      quotaRemaining,
    });
  } catch (err) {
    console.error("[api/ai] assistant turn failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again in a moment." },
      { status: 503 },
    );
  }
}
