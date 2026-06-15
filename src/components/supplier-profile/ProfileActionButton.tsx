"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, X, ArrowUpRight, type LucideIcon } from "lucide-react";
import ChatThread from "@/components/chat/ChatThread";

export type ProfileIntent =
  | "contact"
  | "rfq"
  | "negotiate"
  | "samples"
  | "quote"
  | "ai-sourcing";

type Props = {
  supplierId: string;
  supplierName: string;
  intent: ProfileIntent;
  label: string;
  icon?: LucideIcon;
  className?: string;
  productName?: string;
};

// Builds a tailored opening message so each CTA lands the buyer in the existing
// chat flow with the right intent pre-filled (reusing the conversations + RFQ
// APIs rather than reinventing them).
function openingMessage(intent: ProfileIntent, supplierName: string, product?: string): string | null {
  const p = product || "the products on your profile";
  switch (intent) {
    case "contact":
      return null; // plain contact — supplier auto-greets first
    case "rfq":
      return `📋 Request for Quotation\n• Product: ${p}\n• Quantity: [please advise tiers]\n• Destination: [our facility]\n\nPlease include unit price, MOQ, lead time, payment terms and Incoterms.`;
    case "negotiate":
      return `Hello ${supplierName} team, I'd like to start a negotiation for ${p}. Could you share your best volume pricing, MOQ tiers, and payment terms? We're evaluating recurring orders.`;
    case "samples":
      return `Could you send a sample of ${p} for quality validation before a bulk order? Happy to cover a refundable sample fee.`;
    case "quote":
      return `Please provide a formal quotation for ${p}, including unit price, MOQ, lead time, Incoterms and certifications.`;
    case "ai-sourcing":
      return `I'm using Suplymate AI sourcing to evaluate suppliers for ${p}. Could you confirm capacity, current lead time, and any active promotions?`;
  }
}

export default function ProfileActionButton({
  supplierId,
  supplierName,
  intent,
  label,
  icon: Icon,
  className = "",
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
      router.push(`/login?callbackUrl=/supplier/${supplierId}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, supplierName }),
      });
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/supplier/${supplierId}`);
        return;
      }
      const data = await res.json().catch(() => null);
      const id = data?.conversation?.id as string | undefined;
      if (!res.ok || !id) {
        setError("Could not start the conversation. Please try again.");
        return;
      }
      setConversationId(id);
      setOpen(true);

      const msg = openingMessage(intent, supplierName, productName);
      if (msg) {
        // Fire-and-forget: seed the chat with the intent message (non-blocking).
        fetch(`/api/conversations/${id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: msg }),
        }).catch(() => {});
        if (intent === "rfq") {
          fetch("/api/rfq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: id,
              productName: productName || "Product enquiry",
              quantity: "To be advised",
            }),
          }).catch(() => {});
        }
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
          Icon && <Icon className="h-4 w-4" aria-hidden />
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
