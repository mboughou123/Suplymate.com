"use client";

import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

type Props = {
  variant?: "nav" | "mobile";
};

export default function ThemeToggle({ variant = "nav" }: Props) {
  const t = useTranslations("common");
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? t("switchToLight") : t("switchToDark")}
      aria-pressed={dark}
      className={
        variant === "mobile"
          ? "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5 cursor-pointer"
          : "hidden h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex cursor-pointer"
      }
    >
      <span className="inline-flex items-center gap-2">
        {dark ? (
          <Sun className="h-5 w-5" aria-hidden />
        ) : (
          <Moon className="h-5 w-5" aria-hidden />
        )}
        {variant === "mobile" && (
          <span>{dark ? t("lightMode") : t("darkMode")}</span>
        )}
      </span>
    </button>
  );
}
