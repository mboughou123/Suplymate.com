"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Globe, Check } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  locales,
  localeNames,
  type Locale,
} from "@/i18n/routing";

type LanguageSelectorProps = {
  /** Compact styling for the dark navbar */
  variant?: "navbar" | "mobile";
  className?: string;
};

export default function LanguageSelector({
  variant = "navbar",
  className = "",
}: LanguageSelectorProps) {
  const t = useTranslations("languageSelector");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const switchLocale = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
    router.refresh();
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => {
        listRef.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();
      });
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    const idx = items.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  const isNavbar = variant === "navbar";
  const triggerClass = isNavbar
    ? "inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/90 transition-colors hover:border-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/60"
    : "flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white";

  const panelClass = isNavbar
    ? "absolute end-0 top-full z-50 mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-cardHover"
    : "mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/15 bg-navy-dark py-1";

  const optionClass = (active: boolean, selected: boolean) => {
    if (isNavbar) {
      return `flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm transition-colors focus-visible:outline-none focus-visible:bg-cyan-soft ${
        selected ? "bg-cyan-soft/60 font-semibold text-cyan" : "text-ink hover:bg-slate-50"
      }`;
    }
    return `flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-sm transition-colors focus-visible:outline-none focus-visible:bg-white/10 ${
      selected ? "bg-white/10 font-semibold text-cyan-glow" : "text-white/85 hover:bg-white/5"
    }`;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id="language-selector-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("selectLanguage")}
        title={t("currentLanguage", { language: localeNames[locale] })}
        className={triggerClass}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <Globe className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span className="max-w-[7rem] truncate">{localeNames[locale]}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby="language-selector-trigger"
          aria-label={t("label")}
          className={panelClass}
          onKeyDown={onListKeyDown}
        >
          {locales.map((code) => (
            <li key={code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={code === locale}
                className={optionClass(open, code === locale)}
                onClick={() => switchLocale(code)}
              >
                <span>{localeNames[code]}</span>
                {code === locale && (
                  <Check className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
