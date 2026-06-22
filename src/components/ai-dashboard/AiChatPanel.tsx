"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Trash2,
  User as UserIcon,
  AlertCircle,
} from "lucide-react";

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
  onModeChange?: (mode: "demo" | "openai") => void;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AiChatPanel({ initialQuery, onModeChange }: Props) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const querySent = useRef(false);

  const showWelcome = messages.length === 0 && !loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load the user's most recent conversation so it persists across visits.
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
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setInput("");

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
          }),
          signal: controller.signal,
        });

        const convoId = res.headers.get("x-conversation-id");
        if (convoId) conversationId.current = convoId;
        const source = res.headers.get("x-ai-source");
        if (source === "openai" || source === "demo") onModeChange?.(source);

        const contentType = res.headers.get("content-type") || "";

        if (!res.ok || contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(data?.error || "The AI request failed. Please try again.");
          }
          // JSON (demo mode) response.
          if (data?.conversationId) conversationId.current = data.conversationId;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId ? { ...msg, content: data?.reply ?? "" } : msg
            )
          );
          return;
        }

        // Streaming text response.
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
          // Drop the empty assistant placeholder on error/abort.
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

  function stop() {
    abortRef.current?.abort();
  }

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
    querySent.current = true; // don't re-trigger the initial query
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* Header strip */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 sm:px-6">
        <p className="text-xs font-medium text-ink-muted">
          {streaming ? "Generating response…" : "Procurement assistant"}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {showWelcome ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex max-w-2xl flex-col items-center px-2 py-10 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15">
                <Sparkles className="h-7 w-7 text-gold" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-bold tracking-tight text-ink sm:text-2xl">
                How can I help you source today?
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
                Ask about suppliers, pricing, shipping, MOQs, RFQs, certifications,
                or supplier risk. Answers use Suplymate&apos;s real supplier data
                where available.
              </p>
              <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-ink-muted transition hover:border-gold/50 hover:bg-gold/5 hover:text-ink"
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
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15">
                      <Sparkles className="h-4 w-4 text-gold" aria-hidden />
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed text-ink">
                      {msg.content ? (
                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 py-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
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

      {/* Composer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 transition focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/15">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about suppliers, pricing, logistics, or sourcing strategy…"
              className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-dim focus:outline-none"
            />
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-ink-muted transition hover:bg-slate-100"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-ink transition hover:bg-gold-light disabled:opacity-40"
                aria-label="Send message"
                title="Send"
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-dim">
            Suplymate AI can make mistakes — verify important sourcing decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
