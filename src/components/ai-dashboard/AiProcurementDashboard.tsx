"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import AiChatPanel, { type AiChatMode } from "./AiChatPanel";

const HomeAgentOrb = dynamic(() => import("@/components/home/HomeAgentOrb"), {
  ssr: false,
  loading: () => null,
});

export default function AiProcurementDashboard() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const t = useTranslations("aiAssistant");
  const [aiMode, setAiMode] = useState<AiChatMode>("demo");

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.provider === "grok" || data.provider === "openai") {
          setAiMode(data.provider);
        } else if (data.configured) {
          setAiMode("openai");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex min-h-[calc(100vh-5.5rem)] flex-col overflow-hidden bg-base">
      <HomeAgentOrb variant="background" className="opacity-70" />

      <div className="relative z-[1] mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
        <header className="mb-5 text-center">
          <p className="eyebrow text-cyan">{t("mateEyebrow")}</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("mateTitle")}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{t("mateSubtitle")}</p>
          <p className="mt-3 text-xs text-ink-dim">
            {aiMode === "grok"
              ? t("modeGrok")
              : aiMode === "openai"
                ? t("modeOpenAi")
                : t("modeDemo")}
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-glass backdrop-blur-xl">
          <AiChatPanel
            initialQuery={initialQuery}
            onModeChange={(mode) => setAiMode(mode)}
          />
        </div>
      </div>
    </div>
  );
}
