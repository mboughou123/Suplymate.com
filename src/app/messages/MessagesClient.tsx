"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MessagesSquare, Inbox } from "lucide-react";
import ChatThread from "@/components/chat/ChatThread";
import {
  type ConversationSummary,
  type ConversationStatus,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/types/messaging";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesClient() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("c");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(initial);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/conversations", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations);
    setLoaded(true);
    setSelected((cur) => cur ?? data.conversations[0]?.id ?? null);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.supplierName.toLowerCase().includes(q) ||
        (c.lastMessage?.body ?? "").toLowerCase().includes(q)
    );
  }, [conversations, query]);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl">
      {/* Sidebar */}
      <aside
        className={`w-full flex-col border-r border-slate-200 bg-white md:flex md:w-80 lg:w-96 ${
          selected ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-200 p-4">
          <h1 className="flex items-center gap-2 text-lg font-bold text-ink">
            <MessagesSquare className="h-5 w-5 text-cyan" aria-hidden />
            Messages
          </h1>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loaded && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-ink-dim">
              <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden />
              No conversations yet. Visit the{" "}
              <a href="/suppliers" className="text-cyan hover:underline">
                suppliers
              </a>{" "}
              page and click “Contact supplier”.
            </div>
          )}
          {filtered.map((c) => {
            const active = c.id === selected;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${
                  active ? "bg-cyan/5" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-teal text-sm font-bold text-white">
                  {c.supplierName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">
                      {c.supplierName}
                    </span>
                    <span className="shrink-0 text-[10px] text-ink-dim">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-ink-dim">
                    {c.lastMessage
                      ? `${c.lastMessage.senderType === "buyer" ? "You: " : ""}${c.lastMessage.body}`
                      : "No messages yet"}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[c.status as ConversationStatus]}`}
                  >
                    {STATUS_LABELS[c.status as ConversationStatus]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Thread */}
      <main className={`flex-1 ${selected ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <div className="flex w-full flex-col">
            <button
              onClick={() => setSelected(null)}
              className="border-b border-slate-200 px-4 py-2 text-left text-sm text-cyan md:hidden"
            >
              ← Back to conversations
            </button>
            <ChatThread
              key={selected}
              conversationId={selected}
              className="flex-1"
              onStatusChange={() => load()}
            />
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center text-ink-dim">
            <MessagesSquare className="mb-3 h-12 w-12 text-slate-200" aria-hidden />
            <p className="text-sm">Select a conversation to start messaging.</p>
          </div>
        )}
      </main>
    </div>
  );
}
