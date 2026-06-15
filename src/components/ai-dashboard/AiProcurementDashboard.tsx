"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { FakeAiResponse } from "@/components/ProcurementSuggestionCard";
import AiBackground from "./AiBackground";
import AiDashboardSidebar from "./AiDashboardSidebar";
import AiDashboardHeader from "./AiDashboardHeader";
import AiChatPanel from "./AiChatPanel";
import AiInsightPanel from "./AiInsightPanel";

export default function AiProcurementDashboard() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const querySent = useRef(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"demo" | "openai">("demo");
  const [latestResponse, setLatestResponse] = useState<FakeAiResponse | null>(null);
  const [latestSource, setLatestSource] = useState<string | undefined>();
  const [sendInitialQuery, setSendInitialQuery] = useState<
    ((text: string) => void) | null
  >(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) setAiMode("openai");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialQuery && sendInitialQuery && !querySent.current) {
      querySent.current = true;
      sendInitialQuery(initialQuery);
    }
  }, [initialQuery, sendInitialQuery]);

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-h-[600px] overflow-hidden">
      <AiBackground />

      <AiDashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AiDashboardHeader
          aiMode={aiMode}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex min-h-0 flex-1">
          <AiChatPanel
            onResponse={(response, source) => {
              setLatestResponse(response);
              setLatestSource(source);
            }}
            onModeChange={setAiMode}
            onReady={setSendInitialQuery}
          />
          <AiInsightPanel response={latestResponse} source={latestSource} />
        </div>
      </div>
    </div>
  );
}
