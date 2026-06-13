"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, Mic, Send, Loader2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading?: boolean;
};

export default function AiFloatingInput({
  value,
  onChange,
  onSend,
  loading,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      layout
      className={`ai-input-glow ai-glass mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/60 p-2 shadow-glass transition-all ${
        focused ? "border-gold/30" : ""
      }`}
    >
      <div className="flex items-end gap-2">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-dim transition hover:bg-slate-100 hover:text-ink-muted"
          aria-label="Attach file"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Ask about suppliers, pricing, logistics, or sourcing strategies…"
          className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-dim focus:outline-none"
        />

        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-dim transition hover:bg-slate-100 hover:text-ink-muted"
          aria-label="Voice input"
          title="Voice input"
        >
          <Mic className="h-5 w-5" />
        </button>

        <motion.button
          type="button"
          onClick={onSend}
          disabled={loading || !value.trim()}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-light text-white shadow-gold transition disabled:opacity-40"
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
