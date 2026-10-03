"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { FileText, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

type Props = {
  productName: string;
  details: string;
};

export default function SteelMetalRfqForm({ productName, details }: Props) {
  const t = useTranslations("steelMetal");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const { status } = useSession();
  const router = useRouter();
  const [quantity, setQuantity] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState(details);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qty = quantity.trim();
    if (!qty) {
      setError(t("rfqNeedQuantity"));
      return;
    }
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/rfqs")}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          quantity: qty,
          destination: destination.trim() || undefined,
          details: notes.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/rfqs")}`);
        return;
      }
      if (!res.ok) throw new Error("rfq failed");
      router.push("/rfqs?submitted=1");
    } catch {
      setError(tErrors("generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">{tForms("product")}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{productName}</p>
      </div>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
          {t("rfqQuantity")}
        </span>
        <input
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={t("rfqQuantityPlaceholder")}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus:border-cyan"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
          {t("rfqDestination")}
        </span>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={t("rfqDestinationPlaceholder")}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus:border-cyan"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
          {t("rfqDetails")}
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus:border-cyan"
        />
      </label>
      {error && <p className="text-sm text-down">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-accent w-full cursor-pointer">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("rfqSubmitting")}
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" aria-hidden />
            {t("rfqSubmit")}
          </>
        )}
      </button>
    </form>
  );
}
