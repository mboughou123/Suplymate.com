"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageCircle, X, Loader2, ArrowUpRight, Send } from "lucide-react";
import ChatThread from "@/components/chat/ChatThread";

type Props = {
  supplierId: string;
  supplierName: string;
  className?: string;
  label?: string;
  /** Optional product context for the inquiry (e.g. from a product page). */
  productName?: string;
  /** Optional product id, recorded on the RFQ for traceability. */
  productId?: string;
  /**
   * When true (or when label is "Request Quote"), opens a quote form that
   * pre-fills product, quantity and an editable message before starting the
   * conversation + RFQ.
   */
  quote?: boolean;
};

export default function ContactSupplierButton({
  supplierId,
  supplierName,
  className = "",
  label = "Contact",
  productName,
  productId,
  quote,
}: Props) {
  const { status } = useSession();
  const router = useRouter();
  const isQuote = Boolean(quote || label.toLowerCase().includes("quote"));

  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("");
  const defaultMessage = productName
    ? `Hi ${supplierName}, I'm interested in "${productName}". Please send a quote including unit price, MOQ, lead time and shipping terms.`
    : `Hi ${supplierName}, I'd like more information about your products.`;
  const [message, setMessage] = useState(defaultMessage);

  function requireAuth(): boolean {
    if (status !== "authenticated") {
      const cb = encodeURIComponent("/products");
      router.push(`/login?callbackUrl=${cb}`);
      return false;
    }
    return true;
  }

  async function startConversation(payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, supplierName, productName, productId, ...payload }),
      });
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/products")}`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.conversation?.id) {
        setConversationId(data.conversation.id);
        setFormOpen(false);
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

  function handleClick() {
    if (!requireAuth()) return;
    if (isQuote) {
      setFormOpen(true);
    } else {
      void startConversation({ message: productName ? defaultMessage : "" });
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

      {/* Quote request form */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-cardHover sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <span className="text-sm font-semibold text-ink">Request a quote</span>
              <button onClick={() => setFormOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-ink-dim" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              {productName && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-[11px] uppercase tracking-wide text-ink-dim">Product</p>
                  <p className="font-semibold text-ink">{productName}</p>
                  <p className="text-xs text-ink-muted">Supplier: {supplierName}</p>
                </div>
              )}
              <label className="block text-xs font-semibold text-ink">
                Quantity
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 500 units / 10 tons"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Message
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                />
              </label>
              <button
                type="button"
                disabled={loading}
                onClick={() => startConversation({ quantity, message })}
                className="btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Send quote request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat thread */}
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
              <span className="text-sm font-semibold text-ink">Chat with {supplierName}</span>
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
