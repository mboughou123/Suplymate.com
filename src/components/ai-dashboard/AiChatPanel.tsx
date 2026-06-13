"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateFakeAiResponse } from "@/lib/ai-fallback";
import type { FakeAiResponse } from "@/components/ProcurementSuggestionCard";
import type { ChatMessage } from "./types";
import AiWelcomeScreen from "./AiWelcomeScreen";
import AiMessageBubble from "./AiMessageBubble";
import AiPromptChips from "./AiPromptChips";
import AiFloatingInput from "./AiFloatingInput";

type Props = {
  onResponse: (response: FakeAiResponse, source?: string) => void;
  onModeChange: (mode: "demo" | "openai") => void;
};

export default function AiChatPanel({ onResponse, onModeChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const showWelcome = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setMessages((m) => [...m, { id: `user-${Date.now()}`, role: "user", content: trimmed }]);
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
          const mode = data.source === "openai" ? "openai" : "demo";
          onModeChange(mode);
          onResponse(data.response, data.source);
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
        const fallback = generateFakeAiResponse(trimmed);
        onModeChange("demo");
        onResponse(fallback, "demo");
        setMessages((m) => [
          ...m,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            response: fallback,
            source: "demo",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, onResponse, onModeChange]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {showWelcome ? (
            <AiWelcomeScreen key="welcome" />
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto max-w-3xl space-y-6"
            >
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-navy to-navy-mid px-4 py-3 text-sm text-white shadow-glass">
                      {msg.content}
                    </div>
                  </motion.div>
                ) : (
                  <div key={msg.id}>
                    <AiMessageBubble response={msg.response} />
                  </div>
                )
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-ai-glow/10">
                    <span className="h-2 w-2 animate-ai-pulse rounded-full bg-gold" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-dim">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
                    </span>
                    Analyzing procurement options…
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom area: prompts + input */}
      <div className="shrink-0 border-t border-slate-200/40 bg-white/40 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto max-w-3xl">
          <AiPromptChips onSelect={send} disabled={loading} />
          <div className="mt-4">
            <AiFloatingInput
              value={input}
              onChange={setInput}
              onSend={() => send(input)}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
