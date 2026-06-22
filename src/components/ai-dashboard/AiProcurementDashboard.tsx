"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AiDashboardSidebar from "./AiDashboardSidebar";
import AiDashboardHeader from "./AiDashboardHeader";
import AiChatPanel from "./AiChatPanel";

export default function AiProcurementDashboard() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"demo" | "openai">("demo");

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) setAiMode("openai");
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-h-[600px] overflow-hidden bg-white">
      <AiDashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AiDashboardHeader aiMode={aiMode} onMenuClick={() => setSidebarOpen(true)} />
        <AiChatPanel initialQuery={initialQuery} onModeChange={setAiMode} />
      </div>
    </div>
  );
}
