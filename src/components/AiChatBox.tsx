"use client";

import { useState, useRef, useEffect } from "react";
import ProcurementSuggestionCard, {
  type FakeAiResponse,
} from "./ProcurementSuggestionCard";
import { generateFakeAiResponse } from "@/lib/ai-fallback";

type Message =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; response: FakeAiResponse; source?: string };

const SUGGESTED_PROMPTS = [
  "I need 10 tons of steel delivered to Los Angeles in 2 weeks.",
  "Find me the cheapest aluminum supplier.",
  "Should I buy copper now or wait?",
  "Compare fastest delivery vs cheapest price.",
];

export default function AiChatBox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      response: {
        recommendedSupplier: "Suplymate AI",
        estimatedPrice: "—",
        delivery: "Instant",
        risk: "Low",
        recommendation:
          "Ask about suppliers, materials, timing, or trade-offs for a procurement recommendation.",
        summary:
          "Hello! I'm your AI procurement assistant. Tell me what you need to source, where, and when.",
      },
      source: "demo",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"demo" | "openai">("demo");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) setAiMode("openai");
      })
      .catch(() => {});
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userId = `user-${Date.now()}`;
    setMessages((m) => [...m, { id: userId, role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.response) {
        setAiMode(data.source === "openai" ? "openai" : "demo");
        setMessages((m) => [
          ...m,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            response: data.response,
            source: data.source,
          },
        ]);
      } else {
        throw new Error("API error");
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          response: generateFakeAiResponse(trimmed),
          source: "demo",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-slate-50 shadow-card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <h2 className="font-semibold text-ink">Procurement chat</h2>
        <p className="text-xs text-ink-dim">
          {aiMode === "openai"
            ? "Powered by OpenAI (gpt-4o-mini)"
            : "Demo mode — set OPENAI_API_KEY in .env.local for live AI"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-3 text-sm text-white">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="max-w-full">
              <ProcurementSuggestionCard response={msg.response} />
            </div>
          )
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-dim">
            <span className="inline-flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-mustard [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-mustard [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-mustard [animation-delay:300ms]" />
            </span>
            Analyzing procurement options…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-4 bg-slate-50/50">
        <p className="mb-3 text-xs font-medium text-ink-dim">Suggested prompts</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-ink-muted transition hover:border-cyan hover:text-ink"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about suppliers, prices, or timing…"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-mustard px-5 py-3 text-sm font-semibold text-ink transition hover:bg-mustard-light disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
