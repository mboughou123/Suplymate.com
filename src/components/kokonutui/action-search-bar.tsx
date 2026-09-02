"use client";

/**
 * @author: @kokonutui
 * @description: Action Search Bar (Suplymate command palette)
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  Binoculars,
  FileText,
  GitCompareArrows,
  Radar,
  Search,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import useDebounce from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

type Action = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const SUPLYMATE_ACTIONS: Action[] = [
  {
    id: "find-suppliers",
    label: "Find suppliers",
    description: "Scout verified mills in the directory",
    href: "/suppliers",
    icon: Radar,
  },
  {
    id: "compare-quotes",
    label: "Compare quotes",
    description: "Open products for side-by-side comparison",
    href: "/products",
    icon: GitCompareArrows,
  },
  {
    id: "watch-price",
    label: "Watch a price",
    description: "Track material markets and alerts",
    href: "/price-charts",
    icon: Binoculars,
  },
  {
    id: "open-rfq",
    label: "Open RFQ",
    description: "Start a request for quotation",
    href: "/messages",
    icon: FileText,
  },
];

type Props = {
  className?: string;
  placeholder?: string;
};

export default function ActionSearchBar({
  className,
  placeholder = "Jump to a command…",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 120);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return SUPLYMATE_ACTIONS;
    return SUPLYMATE_ACTIONS.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [debounced]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function run(action: Action) {
    setOpen(false);
    setQuery("");
    router.push(action.href);
  }

  return (
    <div className={cn("relative w-full max-w-md", className)} ref={rootRef}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-cyan/50 focus-within:ring-2 focus-within:ring-cyan/15">
        <Search className="h-4 w-4 text-ink-dim" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-dim focus:outline-none"
          aria-label="Command search"
        />
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-card"
          >
            {results.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => run(action)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-navy/5 text-navy">
                    <action.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {action.label}
                    </span>
                    <span className="block text-[11px] text-ink-dim">
                      {action.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
