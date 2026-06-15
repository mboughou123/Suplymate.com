"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageCircle, X, Loader2, ArrowUpRight } from "lucide-react";
import ChatThread from "@/components/chat/ChatThread";

type Props = {
  supplierId: string;
  supplierName: string;
  className?: string;
  label?: string;
  /** Optional product context for the inquiry (e.g. from a product page). */
  productName?: string;
};

export default function ContactSupplierButton({
  supplierId,
  supplierName,
  className = "",
  label = "Contact",
  productName,
}: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/suppliers`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, supplierName, productName }),
      });
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/suppliers`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.conversation?.id) {
        setConversationId(data.conversation.id);
        setOpen(true);
      } else {
        setError("Could not start the conversation. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <MessageCircle className="h-4 w-4" aria-hidden />
        )}
        {label}
      </button>

      {error && (
        <p className="mt-1 text-center text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}

      {open && conversationId && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-cardHover sm:h-[70vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <span className="text-sm font-semibold text-ink">
                Chat with {supplierName}
              </span>
              <div className="flex items-center gap-3">
                <Link
                  href={`/messages?c=${conversationId}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
                >
                  Open inbox <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <button onClick={() => setOpen(false)} aria-label="Close chat">
                  <X className="h-5 w-5 text-ink-dim" />
                </button>
              </div>
            </div>
            <ChatThread conversationId={conversationId} className="flex-1" />
          </div>
        </div>
      )}
    </>
  );
}
