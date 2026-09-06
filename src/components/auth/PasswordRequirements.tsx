"use client";

import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import type { PasswordChecks, PasswordStrength } from "@/lib/validation/signup";

type Props = {
  id?: string;
  password: string;
  checks: PasswordChecks;
  strength: { score: 0 | 1 | 2 | 3 | 4; label: PasswordStrength };
};

const STRENGTH_BAR: Record<PasswordStrength, string> = {
  empty: "bg-slate-200",
  weak: "bg-red-400",
  fair: "bg-amber-400",
  good: "bg-cyan",
  strong: "bg-emerald-500",
};

const STRENGTH_TEXT: Record<PasswordStrength, string> = {
  empty: "text-ink-dim",
  weak: "text-red-600",
  fair: "text-amber-600",
  good: "text-cyan",
  strong: "text-emerald-700",
};

/**
 * Live password requirements checklist + 4-segment strength meter shown under
 * the sign-up password field. Purely presentational; rules live in
 * `@/lib/validation/signup`.
 */
export default function PasswordRequirements({ id, password, checks, strength }: Props) {
  const t = useTranslations("authentication");

  const rules: { key: keyof PasswordChecks; label: string }[] = [
    { key: "minLength", label: t("passwordRuleMinLength") },
    { key: "hasLetter", label: t("passwordRuleLetter") },
    { key: "hasNumber", label: t("passwordRuleNumber") },
  ];

  const strengthLabel =
    strength.label === "weak"
      ? t("strengthWeak")
      : strength.label === "fair"
        ? t("strengthFair")
        : strength.label === "good"
          ? t("strengthGood")
          : strength.label === "strong"
            ? t("strengthStrong")
            : "";

  return (
    <div id={id} className="mt-2.5 space-y-2.5">
      <div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-ink-dim">{t("passwordStrength")}</span>
          <span
            className={`font-semibold ${STRENGTH_TEXT[strength.label]}`}
            aria-live="polite"
          >
            {strengthLabel}
          </span>
        </div>
        <div
          className="mt-1.5 grid grid-cols-4 gap-1"
          role="meter"
          aria-label={t("passwordStrength")}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={strength.score}
          aria-valuetext={strengthLabel || undefined}
        >
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={`h-1 rounded-full transition-colors duration-300 ${
                segment <= strength.score ? STRENGTH_BAR[strength.label] : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {rules.map(({ key, label }) => {
          const met = checks[key];
          const pristine = password.length === 0;
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 transition-colors ${
                met ? "text-emerald-700" : pristine ? "text-ink-dim" : "text-ink-muted"
              }`}
            >
              {met ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <Circle className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              )}
              <span>{label}</span>
              <span className="sr-only">{met ? " ✓" : ""}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
