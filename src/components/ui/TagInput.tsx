"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
};

/** Chip-style multi-value input (Enter or comma adds; Backspace removes). */
export default function TagInput({ id, value, onChange, placeholder, suggestions = [], max = 40 }: Props) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim().replace(/,+$/, "");
    if (!v) return;
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) return setDraft("");
    if (value.length >= max) return;
    onChange([...value, v]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="mt-1.5 flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus-within:border-cyan/60 focus-within:ring-2 focus-within:ring-cyan/20">
        {value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-cyan-soft px-2 py-1 text-xs font-medium text-cyan"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              className="cursor-pointer rounded p-0.5 text-cyan/70 hover:bg-cyan/10 hover:text-cyan"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              remove(value.length - 1);
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink placeholder:text-ink-dim focus:outline-none"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="cursor-pointer rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-ink-muted transition hover:border-cyan/40 hover:text-cyan"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
