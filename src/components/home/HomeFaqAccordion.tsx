"use client";

import { useId, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type HomeFaqItem = {
  id: string;
  question: string;
  answer: string;
  link?: { href: string; label: string };
};

type Props = {
  items: HomeFaqItem[];
};

export default function HomeFaqAccordion({ items }: Props) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <ul className="divide-y divide-slate-200/80 border-y border-slate-200/80">
      {items.map((item) => {
        const open = openId === item.id;
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <li key={item.id}>
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className={`group flex w-full items-center justify-between gap-4 py-5 text-left transition-colors ${
                  open ? "text-cyan" : "text-ink hover:text-cyan"
                }`}
              >
                <span className="font-display text-body font-semibold sm:text-heading-sm">{item.question}</span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    open
                      ? "rotate-180 border-cyan/30 bg-cyan-soft text-cyan"
                      : "border-slate-200 bg-white text-ink-dim group-hover:border-cyan/30 group-hover:text-cyan"
                  }`}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="pb-6 pr-12"
            >
              <p className="text-body-sm leading-relaxed text-ink-muted sm:text-body">{item.answer}</p>
              {item.link && (
                <Link
                  href={item.link.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan transition hover:gap-2.5"
                >
                  {item.link.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
