"use client";

/**
 * @author: @kokonutui
 * @description: AI Prompt Input (adapted for Suplymate Scout / Compare / Watch)
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  ArrowRight,
  Binoculars,
  Check,
  ChevronDown,
  GitCompareArrows,
  Paperclip,
  Radar,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";

export const SUPLYMATE_AGENTS = ["Scout", "Compare", "Watch"] as const;
export type SuplymateAgent = (typeof SUPLYMATE_AGENTS)[number];

const AGENT_META: Record<
  SuplymateAgent,
  { icon: LucideIcon; blurb: string }
> = {
  Scout: {
    icon: Radar,
    blurb: "Find verified mills matching your specs",
  },
  Compare: {
    icon: GitCompareArrows,
    blurb: "Side-by-side quotes and lead times",
  },
  Watch: {
    icon: Binoculars,
    blurb: "Track prices and delivery risk",
  },
};

interface AIPromptProps {
  agents?: readonly SuplymateAgent[];
  defaultAgent?: SuplymateAgent;
  placeholder?: string;
  headerText?: string;
  headerAction?: string;
  onSubmit?: (value: string, agent: SuplymateAgent) => void;
  className?: string;
  busy?: boolean;
}

export default function AIPrompt({
  agents = SUPLYMATE_AGENTS,
  defaultAgent = "Scout",
  placeholder = "Ask Mate: Scout mills, Compare offers, or Watch a price…",
  headerText = "— 1 AI, 3 agents working for you",
  headerAction = "Open Mate",
  onSubmit,
  className,
  busy = false,
}: AIPromptProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 300,
  });
  const [selectedAgent, setSelectedAgent] = useState<SuplymateAgent>(defaultAgent);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSubmit?.(trimmed, selectedAgent);
    setValue("");
    adjustHeight(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const SelectedIcon = AGENT_META[selectedAgent].icon;

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-navy/5 via-white to-cyan/5 px-4 py-2.5">
          <p className="text-xs font-medium text-ink-muted">
            <span className="font-semibold text-navy">Mate</span>{" "}
            {headerText}
          </p>
          {headerAction ? (
            <span className="hidden text-[11px] font-semibold text-cyan sm:inline">
              {headerAction}
            </span>
          ) : null}
        </div>

        <textarea
          ref={textareaRef}
          id="suplymate-ai-prompt"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={busy}
          className={cn(
            "w-full resize-none border-none bg-slate-50/80 px-4 py-3 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-0",
            "min-h-[72px]"
          )}
        />

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-navy transition hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
            >
              <SelectedIcon className="h-3.5 w-3.5 text-cyan" aria-hidden />
              <AnimatePresence mode="wait">
                <motion.span
                  key={selectedAgent}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                >
                  {selectedAgent}
                </motion.span>
              </AnimatePresence>
              <ChevronDown className="h-3.5 w-3.5 text-ink-dim" aria-hidden />
            </button>
            {menuOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full z-20 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-card"
              >
                {agents.map((agent) => {
                  const Icon = AGENT_META[agent].icon;
                  const active = agent === selectedAgent;
                  return (
                    <button
                      key={agent}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-50"
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                      <span className="flex-1">
                        <span className="block font-semibold text-ink">{agent}</span>
                        <span className="block text-[10px] text-ink-dim">
                          {AGENT_META[agent].blurb}
                        </span>
                      </span>
                      {active && <Check className="mt-0.5 h-3.5 w-3.5 text-cyan" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input ref={fileRef} type="file" className="hidden" aria-hidden />
            <button
              type="button"
              aria-label="Attach file"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-slate-100 p-2 text-ink-dim transition hover:bg-navy/10 hover:text-navy"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Send message"
              disabled={!value.trim() || busy}
              onClick={handleSubmit}
              className={cn(
                "rounded-lg bg-navy p-2 text-white transition hover:bg-navy-mid",
                (!value.trim() || busy) && "opacity-40"
              )}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
