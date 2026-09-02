"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  RotateCcw,
  Trash2,
  User as UserIcon,
  AlertCircle,
} from "lucide-react";
import AIPrompt, { type SuplymateAgent } from "@/components/kokonutui/ai-prompt";

export type AiChatMode = "grok" | "openai" | "demo";

type Role = "user" | "assistant";
type ChatTurn = { id: string; role: Role; content: string };

export const EXAMPLE_PROMPTS = [
  "Find verified steel suppliers in the United States.",
  "Compare the cheapest option with the fastest shipping.",
  "Help me prepare an RFQ for 500 hydraulic cylinders.",
  "What certifications should I check for this product?",
  "What risks should I evaluate before choosing this supplier?",
];

type Props = {
  initialQuery?: string | null;
  onModeChange?: (mode: AiChatMode) => void;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AiChatPanel({ initialQuery, onModeChange }: Props) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const querySent = useRef(false);

  const showWelcome = messages.length === 0 && !loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.conversationId) conversationId.current = data.conversationId;
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: { role: Role; content: string }) => ({
              id: uid(m.role),
              role: m.role,
              content: m.content,
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(
    async (text: string, _agent?: SuplymateAgent) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const userTurn: ChatTurn = { id: uid("user"), role: "user", content: trimmed };
      const assistantId = uid("assistant");
      setMessages((m) => [...m, userTurn, { id: assistantId, role: "assistant", content: "" }]);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            conversationId: conversationId.current,
            agent: _agent,
          }),
          signal: controller.signal,
        });

        const convoId = res.headers.get("x-conversation-id");
        if (convoId) conversationId.current = convoId;
        const source = res.headers.get("x-ai-source");
        if (source === "grok" || source === "openai" || source === "demo") {
          onModeChange?.(source);
        }

        const contentType = res.headers.get("content-type") || "";

        if (!res.ok || contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(data?.error || "The AI request failed. Please try again.");
          }
          if (data?.conversationId) conversationId.current = data.conversationId;
          if (data?.source === "grok" || data?.source === "openai" || data?.source === "demo") {
            onModeChange?.(data.source);
          }
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId ? { ...msg, content: data?.reply ?? "" } : msg
            )
          );
          return;
        }

        setStreaming(true);
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream.");
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((m) =>
            m.map((msg) => (msg.id === assistantId ? { ...msg, content: acc } : msg))
          );
        }
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last && last.id === assistantId && last.content.trim() === "") {
            return m.slice(0, -1);
          }
          return m;
        });
        if (!aborted) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      } finally {
        setLoading(false);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [loading, messages, onModeChange]
  );

  useEffect(() => {
    if (initialQuery && !querySent.current && messages.length === 0) {
      querySent.current = true;
      send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function retry() {
    let idx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    const lastUser = messages[idx];
    setMessages((m) => m.slice(0, idx));
    setError(null);
    send(lastUser.content);
  }

  function clearConversation() {
    if (loading) return;
    setMessages([]);
    setError(null);
    conversationId.current = null;
    querySent.current = true;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-transparent">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-2.5 sm:px-6">
        <p className="text-xs font-medium text-ink-muted">
          {streaming ? "Mate is thinking…" : "Mate · Scout · Compare · Watch"}
        </p>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-slate-100 hover:text-ink disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {showWelcome ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex max-w-2xl flex-col items-center px-2 py-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan/15">
                <Sparkles className="h-7 w-7 text-cyan" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-bold tracking-tight text-ink sm:text-2xl">
                Meet Mate — 1 AI, 3 agents working for you
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
                Scout finds mills, Compare lines up offers, Watch tracks price
                windows. Answers use Suplymate&apos;s real supplier data when
                available — never invented live quotes.
              </p>
              <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-left text-sm text-ink-muted transition hover:border-cyan/50 hover:bg-cyan/5 hover:text-ink"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto max-w-3xl space-y-5"
            >
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end gap-3">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">
                      {msg.content}
                    </div>
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-muted">
                      <UserIcon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan/15">
                      <Sparkles className="h-4 w-4 text-cyan" aria-hidden />
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200 bg-white/90 px-4 py-2.5 text-sm leading-relaxed text-ink">
                      {msg.content ? (
                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 py-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
                  <div className="flex-1 text-sm text-red-700">
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      Retry
                    </button>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-white/70 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto max-w-3xl">
          <AIPrompt
            headerText="— 1 AI, 3 agents working for you"
            headerAction=""
            placeholder="Ask Mate: Scout mills, Compare offers, or Watch a price…"
            busy={loading}
            onSubmit={(value, agent) => send(value, agent)}
          />
          <p className="mt-2 text-center text-[11px] text-ink-dim">
            Mate can make mistakes — verify important sourcing decisions. No invented live prices.
          </p>
        </div>
      </div>
    </div>
  );
}
