"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileText,
  ImageIcon,
  X,
  Languages,
  ScrollText,
  Handshake,
  Loader2,
} from "lucide-react";
import {
  type Message,
  type SupplierMeta,
  type ConversationStatus,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/types/messaging";

type LocalAttachment = {
  fileName: string;
  fileType: string;
  url: string;
  sizeBytes: number;
};

type Props = {
  conversationId: string;
  className?: string;
  onStatusChange?: (status: ConversationStatus) => void;
};

const STATUS_ORDER: ConversationStatus[] = [
  "inquiry",
  "negotiation",
  "sample_sent",
  "order_in_progress",
  "completed",
];

function fileKind(type: string): string {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return "spec";
  return "doc";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatThread({
  conversationId,
  className = "",
  onStatusChange,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<SupplierMeta | null>(null);
  const [supplierName, setSupplierName] = useState("Supplier");
  const [status, setStatus] = useState<ConversationStatus>("inquiry");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanel, setAiPanel] = useState<{ title: string; text: string } | null>(
    null
  );
  const [riskWarning, setRiskWarning] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages);
    setMeta(data.supplierMeta);
    setSupplierName(data.conversation.supplierName);
    setStatus(data.conversation.status);
  }, [conversationId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, typing]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next: LocalAttachment[] = [];
    for (const f of Array.from(files)) {
      next.push({
        fileName: f.name,
        fileType: fileKind(f.type),
        url: URL.createObjectURL(f),
        sizeBytes: f.size,
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 8));
  }, []);

  async function send() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || sending) return;
    setSending(true);
    setRiskWarning(null);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text, attachments }),
        }
      );
      const data = await res.json();
      if (data.risk) setRiskWarning(data.risk.label);
      setInput("");
      setAttachments([]);
      await load();
      setTyping(true);
      setTimeout(async () => {
        await load();
        setTyping(false);
      }, 1500);
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(next: ConversationStatus) {
    setStatus(next);
    onStatusChange?.(next);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function runAi(
    mode: "message" | "rfq" | "negotiate" | "summarize" | "translate"
  ) {
    setAiOpen(false);
    setAiLoading(true);
    try {
      const payload: Record<string, unknown> = {
        mode,
        supplierName,
        prompt: input.trim() || undefined,
      };
      if (mode === "summarize") {
        payload.text = messages
          .map((m) => `${m.senderType}: ${m.body}`)
          .join("\n");
      }
      if (mode === "translate") {
        const lastSupplier = [...messages]
          .reverse()
          .find((m) => m.senderType === "supplier");
        payload.text = lastSupplier?.body ?? input;
        payload.targetLanguage = "English";
      }
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (mode === "message" || mode === "rfq") {
        setInput(data.text);
      } else {
        const titles = {
          negotiate: "Negotiation strategy",
          summarize: "Conversation summary",
          translate: "Translation",
        } as const;
        setAiPanel({ title: titles[mode], text: data.text });
      }
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      {/* Supplier header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-teal text-sm font-bold text-white">
              {supplierName.slice(0, 2).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                meta?.online ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-ink">{supplierName}</span>
              {meta?.verified && (
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-ink-dim">
              <span>{meta?.lastActive ?? "—"}</span>
              <span>·</span>
              <span>Replies {meta?.responseTime ?? "—"}</span>
              <span>·</span>
              <span>{meta?.responseRate ?? "—"}% response rate</span>
            </div>
          </div>
        </div>
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value as ConversationStatus)}
          className={`rounded-lg border-0 px-2.5 py-1 text-xs font-semibold focus:ring-2 focus:ring-cyan ${STATUS_STYLES[status]}`}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className={`relative flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 ${
          dragOver ? "ring-2 ring-inset ring-cyan" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-cyan bg-white/70 text-sm font-semibold text-cyan">
            Drop files to attach
          </div>
        )}

        {messages.map((m) => {
          if (m.senderType === "system") {
            return (
              <div key={m.id} className="text-center">
                <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] text-ink-dim">
                  {m.body}
                </span>
              </div>
            );
          }
          const mine = m.senderType === "buyer";
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[78%]">
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    mine
                      ? "rounded-br-md bg-gradient-to-br from-cyan to-teal text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-ink"
                  }`}
                >
                  {m.body}
                  {m.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.attachments.map((a) => (
                        <AttachmentChip key={a.id} fileType={a.fileType} fileName={a.fileName} url={a.url} mine={mine} />
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={`mt-1 flex items-center gap-1 text-[10px] text-ink-dim ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  {formatTime(m.createdAt)}
                  {mine && (
                    <span className={m.readAt ? "text-cyan" : ""}>
                      {m.readAt ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
                {mine && m.riskFlag && (
                  <div className="mt-1 flex items-start gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
                    <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    Flagged by fraud detection — avoid off-platform payments.
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
            </div>
          </div>
        )}
      </div>

      {/* AI panel */}
      {aiPanel && (
        <div className="border-t border-slate-200 bg-cyan/5 px-4 py-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {aiPanel.title}
            </span>
            <button onClick={() => setAiPanel(null)} aria-label="Dismiss">
              <X className="h-4 w-4 text-ink-dim" />
            </button>
          </div>
          <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-ink-muted">
            {aiPanel.text}
          </p>
        </div>
      )}

      {/* Fraud warning */}
      {riskWarning && (
        <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
          {riskWarning}
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 pt-3">
          {attachments.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-ink-muted"
            >
              {a.fileType === "image" ? (
                <ImageIcon className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="max-w-[140px] truncate">{a.fileName}</span>
              <button
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setAiOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan hover:bg-cyan/15"
              aria-label="AI assistant"
              title="AI assistant"
            >
              {aiLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </button>
            {aiOpen && (
              <div className="absolute bottom-12 left-0 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-cardHover">
                <AiItem icon={Sparkles} label="Compose professional message" onClick={() => runAi("message")} />
                <AiItem icon={ScrollText} label="Generate RFQ template" onClick={() => runAi("rfq")} />
                <AiItem icon={Handshake} label="Negotiation strategy" onClick={() => runAi("negotiate")} />
                <AiItem icon={ScrollText} label="Summarize conversation" onClick={() => runAi("summarize")} />
                <AiItem icon={Languages} label="Translate last reply" onClick={() => runAi("translate")} />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-ink-muted hover:bg-slate-200"
            aria-label="Attach file"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Write a message…  (Enter to send)"
            className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/40"
          />

          <button
            type="button"
            onClick={send}
            disabled={sending || (!input.trim() && attachments.length === 0)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-teal text-white disabled:opacity-40"
            aria-label="Send"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AiItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink-muted hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-cyan" aria-hidden />
      {label}
    </button>
  );
}

function AttachmentChip({
  fileType,
  fileName,
  url,
  mine,
}: {
  fileType: string;
  fileName: string;
  url: string;
  mine: boolean;
}) {
  if (fileType === "image" && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={fileName}
        className="max-h-40 rounded-lg border border-white/20 object-cover"
      />
    );
  }
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
        mine ? "bg-white/15 text-white" : "bg-slate-100 text-ink-muted"
      }`}
    >
      <FileText className="h-3.5 w-3.5" aria-hidden />
      <span className="max-w-[160px] truncate">{fileName}</span>
    </a>
  );
}
