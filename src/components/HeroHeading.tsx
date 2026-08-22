"use client";

import { useTranslations } from "next-intl";

export default function HeroHeading() {
  const t = useTranslations("hero");

  return (
    <h1 className="mt-6 font-display text-display text-ink sm:text-display-lg lg:text-display-xl text-balance">
      {t.rich("title", {
        highlight: () => (
          <span className="gradient-text">{t("titleHighlight")}</span>
        ),
      })}
    </h1>
  );
}
