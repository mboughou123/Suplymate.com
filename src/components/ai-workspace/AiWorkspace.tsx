"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, RotateCcw, Trash2, Sparkles, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import AiOrb from "@/components/fx/AiOrb";
import WorkspaceTopBar from "@/components/ai-workspace/WorkspaceTopBar";
import WorkflowStrip from "@/components/ai-workspace/WorkflowStrip";
import Composer from "@/components/ai-workspace/Composer";
import IntelligencePanel from "@/components/ai-workspace/IntelligencePanel";
import {
  glass,
  type AiBlock,
  type AiResponse,
  type ChatTurn,
  type OrbState,
  type PanelTab,
  type WorkflowStageId,
} from "@/components/ai-workspace/types";

const EXAMPLES = [
  "Find aluminum suppliers in California.",
  "I need 10 tons of steel delivered to San Diego.",
  "What's the difference between 6061 and 7075 aluminum?",
  "I want to build a house. What materials do I need?",
  "Compare steel, aluminum and stainless prices.",
  "I'm starting a manufacturing company. What suppliers should I look for?",
];

const CAPABILITIES = [
  { title: "Supplier matches", body: "Real listed suppliers scored on price, delivery, quality, location and trust — with the reasons." },
  { title: "Price comparison", body: "Catalog material prices side by side, every row labelled with its source." },
  { title: "Material intelligence", body: "Properties, grades, alternatives, price drivers and manufacturing notes." },
  { title: "Sourcing strategy", body: "An 8-step plan from requirement to selected supplier, built for beginners too." },
];

function uid(p: string) {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function tabForBlocks(blocks: AiBlock[]): PanelTab {
  if (blocks.some((b) => b.type === "supplier_matches")) return "matches";
  if (blocks.some((b) => b.type === "material_intel")) return "materials";
  if (blocks.some((b) => b.type === "price_comparison")) return "prices";
  return "strategy";
}

export default function AiWorkspace() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const { status } = useSession();

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [orb, setOrb] = useState<OrbState>("breathing");
  const [stage, setStage] = useState<WorkflowStageId | null>(null);
  const [engine, setEngine] = useState<"openai" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [tab, setTab] = useState<PanelTab>("matches");
  const conversationId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const latestBlocks = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.blocks?.length) return m.blocks;
    }
    return [] as AiBlock[];
  }, [messages]);

  const hasConversation = messages.length > 0;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setEngine(data.engine === "openai" ? "openai" : "demo");
        if (data.conversationId) conversationId.current = data.conversationId;
        if (Array.isArray(data.messages) && data.messages.length) {
          setMessages(
            data.messages.map((m: { role: "user" | "assistant"; content: string }) => ({
              id: uid(m.role),
              role: m.role,
              content: m.content,
            })),
          );
        }
      })
      .catch(() => setEngine("demo"));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setError(null);
      setNeedsAuth(false);
      setInput("");

      const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const userTurn: ChatTurn = { id: uid("u"), role: "user", content: trimmed };
      setMessages((m) => [...m, userTurn]);
      setBusy(true);
      setOrb(/find|supplier|source|need/i.test(trimmed) ? "searching" : /compare|price|cheap/i.test(trimmed) ? "solving" : "working");

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, conversationId: conversationId.current }),
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as (AiResponse & { conversationId?: string; error?: string }) | null;
        if (res.status === 401) {
          setNeedsAuth(true);
          setMessages((m) => m.filter((x) => x.id !== userTurn.id));
          setInput(trimmed);
          return;
        }
        if (!res.ok || !data) throw new Error(data?.error || "The assistant is unavailable. Please try again.");
        if (data.conversationId) conversationId.current = data.conversationId;
        setEngine(data.source);
        setStage(data.stage);
        setOrb(data.state);
        setMessages((m) => [
          ...m,
          {
            id: uid("a"),
            role: "assistant",
            content: data.reply,
            blocks: data.blocks,
            requirement: data.requirement,
            source: data.source,
          },
        ]);
        if (data.blocks.length) setTab(tabForBlocks(data.blocks));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setMessages((m) => m.filter((x) => x.id !== userTurn.id));
          setInput(trimmed);
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
        window.setTimeout(() => setOrb("listening"), 400);
      }
    },
    [busy, messages],
  );

  useEffect(() => {
    if (initialQuery && !sentInitial.current && status !== "loading") {
      sentInitial.current = true;
      void send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, status]);

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((m) => m.slice(0, m.lastIndexOf(lastUser)));
    void send(lastUser.content);
  }

  function reset() {
    if (busy) return;
    setMessages([]);
    setStage(null);
    setError(null);
    conversationId.current = null;
    setOrb("breathing");
  }

  return (
    <div className="relative min-h-screen bg-[#050B12] text-white">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-cyan/15 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-[#0EA5E9]/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <WorkspaceTopBar engine={engine} />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-24 sm:px-6">
        <AnimatePresence mode="wait">
          {!hasConversation ? (
            <motion.section
              key="hero"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-4xl pt-14 text-center sm:pt-20"
            >
              <div className="mx-auto mb-8 inline-flex h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_0_80px_rgba(56,189,248,0.25)] backdrop-blur">
                <AiOrb state={busy ? orb : "breathing"} size={64} theme="dark" />
              </div>
              <p className="eyebrow text-cyan-glow">Meet Mate — your AI sourcing expert</p>
              <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Source smarter <span className="gradient-text-light whitespace-nowrap">with AI.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
                Find suppliers, compare prices, understand materials, and make better procurement decisions with an AI trained for industrial sourcing.
              </p>

              <div className="mx-auto mt-10 max-w-3xl text-left">
                <Composer
                  value={input}
                  onChange={setInput}
                  onSend={() => send(input)}
                  onStop={() => abortRef.current?.abort()}
                  busy={busy}
                  placeholder="Describe what you need to source — material, quantity, destination, timeline…"
                  large
                />
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => send(ex)}
                      disabled={busy}
                      className="cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-white/70 transition hover:border-cyan-glow/40 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {needsAuth && <AuthPrompt />}
              {error && <ErrorBanner error={error} onRetry={retry} />}

              <div className="mt-14">
                <WorkflowStrip stage={null} />
              </div>

              <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                {CAPABILITIES.map((c) => (
                  <div key={c.title} className={`${glass} p-4`}>
                    <Sparkles className="h-4 w-4 text-cyan-glow" aria-hidden />
                    <p className="mt-3 text-sm font-semibold text-white">{c.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">{c.body}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="pt-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <WorkflowStrip stage={stage} />
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-white/55 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> New conversation
                </button>
              </div>

              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
                {/* Conversation */}
                <div className="flex min-h-[60vh] flex-col">
                  <div className="flex-1 space-y-4">
                    {messages.map((m) =>
                      m.role === "user" ? (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-sm text-navy-deep">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex gap-3">
                          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            <AiOrb state="breathing" size={20} theme="dark" paused />
                          </span>
                          <div className="min-w-0 flex-1">
                            {m.requirement && (m.requirement.materials.length || m.requirement.location || m.requirement.quantity) ? (
                              <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
                                {m.requirement.materials.map((x) => (
                                  <span key={x} className="rounded-md border border-cyan-glow/30 bg-cyan/10 px-1.5 py-0.5 text-cyan-glow">{x}</span>
                                ))}
                                {m.requirement.quantity && <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/70">{m.requirement.quantity}</span>}
                                {m.requirement.location && <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/70">→ {m.requirement.location}</span>}
                              </div>
                            ) : null}
                            <div className={`${glass} whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed text-white/90`}>
                              {m.content}
                            </div>
                            {m.blocks && m.blocks.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
                                {m.blocks.map((b) => (
                                  <button
                                    key={b.type}
                                    type="button"
                                    onClick={() => {
                                      setTab(tabForBlocks([b]));
                                      document.getElementById("intelligence-panel")?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className="rounded-full border border-cyan-glow/30 bg-cyan/10 px-2.5 py-1 text-[11px] text-cyan-glow"
                                  >
                                    View {b.type.replace("_", " ")}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}

                    {busy && (
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                          <AiOrb state={orb} size={20} theme="dark" />
                        </span>
                        <p className="text-xs text-white/55">
                          {orb === "searching" ? "Searching listed suppliers…" : orb === "solving" ? "Comparing options…" : "Working on it…"}
                        </p>
                      </div>
                    )}
                    {needsAuth && <AuthPrompt />}
                    {error && <ErrorBanner error={error} onRetry={retry} />}
                    <div ref={bottomRef} />
                  </div>

                  <div className="sticky bottom-4 mt-6">
                    <Composer
                      value={input}
                      onChange={setInput}
                      onSend={() => send(input)}
                      onStop={() => abortRef.current?.abort()}
                      busy={busy}
                      placeholder="Ask a follow-up — refine location, quantity, certifications…"
                    />
                    <p className="mt-2 text-center text-[11px] text-white/40">
                      Mate uses Suplymate data for suppliers and prices. Verify important decisions.
                    </p>
                  </div>
                </div>

                {/* Intelligence panel */}
                <aside id="intelligence-panel" className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
                  <IntelligencePanel blocks={latestBlocks} tab={tab} onTab={setTab} />
                </aside>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AuthPrompt() {
  return (
    <div className={`${glass} mx-auto mt-6 flex max-w-xl flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-cyan-glow">
        <LogIn className="h-5 w-5" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Sign in to ask Mate</p>
        <p className="text-xs text-white/60">Free accounts include AI questions, supplier matching and material intelligence.</p>
      </div>
      <Link href="/login?callbackUrl=/ai-assistant" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-cyan-glow">
        Sign in
      </Link>
    </div>
  );
}

function ErrorBanner({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-4 flex max-w-xl items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-left">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
      <div className="flex-1 text-sm text-red-100">
        <p>{error}</p>
        <button type="button" onClick={onRetry} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry
        </button>
      </div>
    </div>
  );
}
