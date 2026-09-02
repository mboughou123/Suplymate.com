"use client";

/**
 * @author: @kokonutui
 * @description: AI Input Search (adapted for Suplymate supplier/product search)
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Search, Send } from "lucide-react";
import { useState } from "react";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";

interface AIInputSearchProps {
  placeholder?: string;
  searchLabel?: string;
  onSubmit?: (value: string) => void;
  className?: string;
  compact?: boolean;
}

export default function AIInputSearch({
  placeholder = "Search suppliers, products, or specs…",
  searchLabel = "Search",
  onSubmit,
  className,
  compact = false,
}: AIInputSearchProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: compact ? 40 : 52,
    maxHeight: 160,
  });
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setValue("");
    adjustHeight(true);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex w-full items-end gap-2 rounded-xl border bg-white px-3 py-2 transition",
          isFocused
            ? "border-cyan/50 ring-2 ring-cyan/15"
            : "border-slate-200"
        )}
      >
        <Search className="mb-2 h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "max-h-40 flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-dim focus:outline-none",
            compact ? "min-h-[40px] py-2" : "min-h-[52px] py-2.5"
          )}
          aria-label={searchLabel}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-white transition hover:bg-navy-mid disabled:opacity-40"
          aria-label={searchLabel}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
