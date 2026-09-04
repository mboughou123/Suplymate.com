"use client";

import { useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import Beam from "@/components/fx/Beam";
import MetalButton from "@/components/fx/MetalButton";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
  large?: boolean;
};

export default function Composer({ value, onChange, onSend, onStop, busy, disabled, placeholder, large }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!busy && value.trim()) onSend();
    }
  }

  const inner = (
    <div
      className={`flex items-end gap-2 rounded-2xl border border-white/12 bg-[#0A1622]/90 p-2 shadow-[0_20px_60px_-20px_rgba(3,105,161,0.45)] transition focus-within:border-cyan-glow/50 ${
        large ? "sm:p-3" : ""
      }`}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={large ? 2 : 1}
        disabled={disabled}
        placeholder={placeholder}
        className={`max-h-48 flex-1 resize-none bg-transparent px-2 py-2 text-white placeholder:text-white/35 focus:outline-none disabled:opacity-50 ${
          large ? "min-h-[56px] text-base" : "min-h-[40px] text-sm"
        }`}
        aria-label="Ask Mate"
      />
      {busy && onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:bg-white/10"
          aria-label="Stop"
        >
          <Square className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <MetalButton variant="circle" preset="chromatic" strength={value.trim() ? 0.9 : 0.35}>
          <button
            type="button"
            onClick={onSend}
            disabled={busy || disabled || !value.trim()}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-navy-deep transition disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Ask AI"
            title="Ask AI"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
        </MetalButton>
      )}
    </div>
  );

  return large ? (
    <Beam size="md" colorVariant="ocean" strength={0.7} active={!busy}>
      {inner}
    </Beam>
  ) : (
    inner
  );
}
