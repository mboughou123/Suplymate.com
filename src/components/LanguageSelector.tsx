"use client";

/**
 * Language switcher is hidden while the site is English-only.
 * Locale files, next-intl routing, and English `/en` routes stay in place.
 */
type LanguageSelectorProps = {
  variant?: "navbar" | "mobile" | "inline";
  className?: string;
  compactLabel?: boolean;
};

export default function LanguageSelector(_props: LanguageSelectorProps) {
  return null;
}
