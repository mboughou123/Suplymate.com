"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";

type Props = {
  item: {
    productId: string;
    productName: string;
    supplierId: string;
    supplierName: string;
    imageUrl?: string | null;
    unit?: string | null;
    basePrice?: number | null;
    currency?: string | null;
  };
  className?: string;
};

export default function SaveProductButton({ item, className }: Props) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/saved", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (res.ok) setSaved(!saved);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-muted hover:border-cyan/40 hover:text-cyan disabled:opacity-60"
      }
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-cyan text-cyan" : ""}`} aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
